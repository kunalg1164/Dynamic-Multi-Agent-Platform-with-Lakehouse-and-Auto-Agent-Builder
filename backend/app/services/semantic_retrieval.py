import numpy as np
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
from ..services.duckdb_analytics import DuckDBAnalytics
import boto3
from botocore.client import Config
import fitz  # PyMuPDF
from PIL import Image
import io
import json
from ..core.config import get_settings

settings = get_settings()

class SemanticRetrievalService:
    def __init__(self, analytics: DuckDBAnalytics, model_name: str = 'all-MiniLM-L6-v2'):
        self.analytics = analytics
        self.model = SentenceTransformer(model_name)
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.minio_endpoint,
            aws_access_key_id=settings.minio_access_key,
            aws_secret_access_key=settings.minio_secret_key,
            config=Config(signature_version='s3v4')
        )
        self.bucket_name = 'lakehouse-raw'
        self._init_tables()
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except Exception as e:
            # Bucket doesn't exist or MinIO not available, try to create it
            try:
                self.s3_client.create_bucket(Bucket=self.bucket_name)
            except Exception as e:
                # MinIO might not be running yet, log and continue
                print(f"Warning: Could not connect to MinIO: {e}. Lakehouse storage will be unavailable until MinIO is running.")

    def _init_tables(self):
        """Initialize tables for storing documents and embeddings."""
        # Raw documents table - use rowid automatically
        self.analytics.conn.execute("""
            CREATE TABLE IF NOT EXISTS raw_documents (
                id INTEGER,
                agent_id INTEGER,
                filename VARCHAR,
                s3_key VARCHAR,
                content_type VARCHAR,
                extracted_text TEXT,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Bronze layer: cleaned data
        self.analytics.conn.execute("""
            CREATE TABLE IF NOT EXISTS bronze_documents (
                id INTEGER,
                raw_document_id INTEGER,
                cleaned_text TEXT,
                metadata JSON,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Silver layer: structured data
        self.analytics.conn.execute("""
            CREATE TABLE IF NOT EXISTS silver_documents (
                id INTEGER,
                bronze_document_id INTEGER,
                structured_data JSON,
                domain VARCHAR,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Gold layer: agent-specific curated data
        self.analytics.conn.execute("""
            CREATE TABLE IF NOT EXISTS gold_agent_data (
                id INTEGER,
                silver_document_id INTEGER,
                agent_id INTEGER,
                curated_content TEXT,
                embeddings_table VARCHAR,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Document embeddings table
        self.analytics.conn.execute("""
            CREATE TABLE IF NOT EXISTS document_embeddings (
                id INTEGER,
                gold_data_id INTEGER,
                embedding BLOB,
                chunk_text TEXT,
                chunk_index INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

    def _next_id(self, table_name: str) -> int:
        """Generate a stable integer ID for DuckDB tables without autoincrement."""
        result = self.analytics.conn.execute(
            f"SELECT COALESCE(MAX(id), 0) + 1 FROM {table_name}"
        ).fetchone()
        return int(result[0])

    def _extract_text_from_file(self, content: bytes, content_type: str) -> str:
        """Extract text from various file types."""
        if content_type.startswith('text/'):
            return content.decode('utf-8', errors='ignore')
        elif content_type == 'application/pdf':
            doc = fitz.open(stream=content, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            return text
        elif content_type.startswith('image/'):
            # Basic OCR placeholder - in production, use Tesseract or similar
            image = Image.open(io.BytesIO(content))
            # For now, return basic metadata
            return f"Image: {image.format}, Size: {image.size}"
        else:
            return "Unsupported file type"

    def store_document(self, agent_id: int, filename: str, content: bytes, content_type: str) -> int:
        """Store a raw document in MinIO and extract text."""
        extracted_text = self._extract_text_from_file(content, content_type)

        # Upload to MinIO
        s3_key = f"agent_{agent_id}/{filename}"
        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=s3_key,
            Body=content,
            ContentType=content_type
        )

        # Store metadata in DuckDB with explicit IDs for compatibility
        raw_document_id = self._next_id("raw_documents")
        self.analytics.conn.execute("""
            INSERT INTO raw_documents (id, agent_id, filename, s3_key, content_type, extracted_text)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (raw_document_id, agent_id, filename, s3_key, content_type, extracted_text))
        return raw_document_id

    def process_to_bronze(self, raw_document_id: int) -> int:
        """Clean raw data and move to bronze layer."""
        raw_doc = self.analytics.conn.execute("""
            SELECT extracted_text, content_type FROM raw_documents WHERE id = ?
        """, (raw_document_id,)).fetchone()

        if not raw_doc:
            raise ValueError("Raw document not found")

        # Basic cleaning
        cleaned_text = raw_doc[0].strip()
        metadata = {"content_type": raw_doc[1], "word_count": len(cleaned_text.split())}

        bronze_document_id = self._next_id("bronze_documents")
        self.analytics.conn.execute("""
            INSERT INTO bronze_documents (id, raw_document_id, cleaned_text, metadata)
            VALUES (?, ?, ?, ?)
        """, (bronze_document_id, raw_document_id, cleaned_text, str(metadata)))
        return bronze_document_id

    def process_to_silver(self, bronze_document_id: int, domain: str) -> int:
        """Structure data for domain-specific use."""
        bronze_doc = self.analytics.conn.execute("""
            SELECT cleaned_text FROM bronze_documents WHERE id = ?
        """, (bronze_document_id,)).fetchone()

        if not bronze_doc:
            raise ValueError("Bronze document not found")

        # Preserve full cleaned content so retrieval can answer from uploaded files.
        structured_data = {"domain": domain, "content": bronze_doc[0]}

        silver_document_id = self._next_id("silver_documents")
        self.analytics.conn.execute("""
            INSERT INTO silver_documents (id, bronze_document_id, structured_data, domain)
            VALUES (?, ?, ?, ?)
        """, (silver_document_id, bronze_document_id, json.dumps(structured_data), domain))
        return silver_document_id

    def process_to_gold(self, silver_document_id: int, agent_id: int) -> int:
        """Create agent-specific curated content."""
        silver_doc = self.analytics.conn.execute("""
            SELECT structured_data FROM silver_documents WHERE id = ?
        """, (silver_document_id,)).fetchone()

        if not silver_doc:
            raise ValueError("Silver document not found")

        # Curated content should be direct readable text for embedding quality.
        curated_content = str(silver_doc[0])
        try:
            parsed = json.loads(curated_content)
            if isinstance(parsed, dict):
                curated_content = str(parsed.get("content") or curated_content)
        except Exception:
            pass

        gold_data_id = self._next_id("gold_agent_data")
        self.analytics.conn.execute("""
            INSERT INTO gold_agent_data (id, silver_document_id, agent_id, curated_content, embeddings_table)
            VALUES (?, ?, ?, ?, ?)
        """, (gold_data_id, silver_document_id, agent_id, curated_content, f"embeddings_agent_{agent_id}"))
        # Chunk and embed
        self.chunk_and_embed_document(gold_data_id, curated_content)
        return gold_data_id

    def chunk_and_embed_document(self, gold_data_id: int, content: str, chunk_size: int = 500):
        """Chunk the document and store embeddings."""
        chunks = self._chunk_text(content, chunk_size)
        embeddings = self.model.encode(chunks)

        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            embedding_bytes = embedding.tobytes()
            embedding_id = self._next_id("document_embeddings")
            self.analytics.conn.execute("""
                INSERT INTO document_embeddings (id, gold_data_id, embedding, chunk_text, chunk_index)
                VALUES (?, ?, ?, ?, ?)
            """, (embedding_id, gold_data_id, embedding_bytes, chunk, i))

    def _chunk_text(self, text: str, chunk_size: int) -> List[str]:
        """Simple text chunking by characters."""
        return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

    def retrieve_relevant_chunks(self, query: str, agent_id: int, top_k: int = 5) -> List[Dict[str, Any]]:
        """Retrieve most relevant document chunks for a query."""
        query_embedding = self.model.encode([query])[0]

        # Get all embeddings for the agent
        results = self.analytics.conn.execute("""
            SELECT de.chunk_text, de.chunk_index, rd.filename, rd.content_type,
                   de.embedding as embedding_bytes
            FROM document_embeddings de
            JOIN gold_agent_data gad ON de.gold_data_id = gad.id
            JOIN silver_documents sd ON gad.silver_document_id = sd.id
            JOIN bronze_documents bd ON sd.bronze_document_id = bd.id
            JOIN raw_documents rd ON bd.raw_document_id = rd.id
            WHERE gad.agent_id = ?
        """, (agent_id,)).fetchall()

        if not results:
            # Fallback for newly uploaded docs that are not embedded yet.
            fallback_rows = self.analytics.conn.execute("""
                SELECT filename, content_type, extracted_text
                FROM raw_documents
                WHERE agent_id = ? AND extracted_text IS NOT NULL
                ORDER BY uploaded_at DESC
                LIMIT ?
            """, (agent_id, top_k)).fetchall()
            return [
                {
                    'chunk_text': row[2][:1000],
                    'chunk_index': 0,
                    'filename': row[0],
                    'content_type': row[1],
                    'similarity': 0.0
                }
                for row in fallback_rows
                if row[2]
            ]

        # Calculate similarities
        similarities = []
        for row in results:
            embedding = np.frombuffer(row[4], dtype=np.float32)
            similarity = np.dot(query_embedding, embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(embedding)
            )
            similarities.append({
                'chunk_text': row[0],
                'chunk_index': row[1],
                'filename': row[2],
                'content_type': row[3],
                'similarity': float(similarity)
            })

        # Sort by similarity and return top_k
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        return similarities[:top_k]

    def get_agent_documents(self, agent_id: int) -> List[Dict[str, Any]]:
        """Get all documents for an agent."""
        results = self.analytics.conn.execute("""
            SELECT rd.id, rd.filename, rd.content_type, rd.uploaded_at,
                   CASE WHEN gad.id IS NOT NULL THEN 'gold' ELSE 'processing' END as status
            FROM raw_documents rd
            LEFT JOIN bronze_documents bd ON rd.id = bd.raw_document_id
            LEFT JOIN silver_documents sd ON bd.id = sd.bronze_document_id
            LEFT JOIN gold_agent_data gad ON sd.id = gad.silver_document_id AND gad.agent_id = rd.agent_id
            WHERE rd.agent_id = ?
            ORDER BY rd.uploaded_at DESC
        """, (agent_id,)).fetchall()

        return [{
            'id': row[0],
            'filename': row[1],
            'content_type': row[2],
            'uploaded_at': row[3],
            'processing_status': row[4]
        } for row in results]

    def remove_document(self, agent_id: int, document_id: int) -> bool:
        """Remove a document and all derived lakehouse records for an agent."""
        raw_doc = self.analytics.conn.execute(
            "SELECT id, s3_key FROM raw_documents WHERE id = ? AND agent_id = ?",
            (document_id, agent_id),
        ).fetchone()
        if not raw_doc:
            return False

        raw_document_id, s3_key = raw_doc

        # Delete storage object first. If object is already missing, continue cleanup.
        try:
            if s3_key:
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
        except Exception:
            pass

        bronze_ids = [
            row[0]
            for row in self.analytics.conn.execute(
                "SELECT id FROM bronze_documents WHERE raw_document_id = ?",
                (raw_document_id,),
            ).fetchall()
        ]
        silver_ids: List[int] = []
        gold_ids: List[int] = []

        if bronze_ids:
            placeholders = ",".join(["?"] * len(bronze_ids))
            silver_ids = [
                row[0]
                for row in self.analytics.conn.execute(
                    f"SELECT id FROM silver_documents WHERE bronze_document_id IN ({placeholders})",
                    tuple(bronze_ids),
                ).fetchall()
            ]

        if silver_ids:
            placeholders = ",".join(["?"] * len(silver_ids))
            gold_ids = [
                row[0]
                for row in self.analytics.conn.execute(
                    f"SELECT id FROM gold_agent_data WHERE silver_document_id IN ({placeholders}) AND agent_id = ?",
                    (*silver_ids, agent_id),
                ).fetchall()
            ]

        if gold_ids:
            placeholders = ",".join(["?"] * len(gold_ids))
            self.analytics.conn.execute(
                f"DELETE FROM document_embeddings WHERE gold_data_id IN ({placeholders})",
                tuple(gold_ids),
            )
            self.analytics.conn.execute(
                f"DELETE FROM gold_agent_data WHERE id IN ({placeholders})",
                tuple(gold_ids),
            )

        if silver_ids:
            placeholders = ",".join(["?"] * len(silver_ids))
            self.analytics.conn.execute(
                f"DELETE FROM silver_documents WHERE id IN ({placeholders})",
                tuple(silver_ids),
            )

        if bronze_ids:
            placeholders = ",".join(["?"] * len(bronze_ids))
            self.analytics.conn.execute(
                f"DELETE FROM bronze_documents WHERE id IN ({placeholders})",
                tuple(bronze_ids),
            )

        self.analytics.conn.execute(
            "DELETE FROM raw_documents WHERE id = ? AND agent_id = ?",
            (raw_document_id, agent_id),
        )
        return True

    def get_processing_status(self) -> Dict[str, Any]:
        """Get overall lakehouse processing status."""
        stats = {}
        for layer in ['raw_documents', 'bronze_documents', 'silver_documents', 'gold_agent_data']:
            count = self.analytics.conn.execute(f"SELECT COUNT(*) FROM {layer}").fetchone()[0]
            stats[layer] = count
        return stats