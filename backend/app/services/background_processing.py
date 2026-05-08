from typing import Dict, Any, List
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging
from ..services.semantic_retrieval import SemanticRetrievalService

logger = logging.getLogger(__name__)

class BackgroundProcessingService:
    def __init__(self, semantic_service: SemanticRetrievalService):
        self.semantic_service = semantic_service
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.processing_queue = asyncio.Queue()
        self.is_running = False

    async def start_processing(self):
        """Start the background processing loop."""
        self.is_running = True
        logger.info("Starting background document processing service")

        while self.is_running:
            try:
                # Get next document to process
                task = await self.processing_queue.get()

                # Process in thread pool to avoid blocking
                await asyncio.get_event_loop().run_in_executor(
                    self.executor, self._process_document_task, task
                )

                self.processing_queue.task_done()

            except Exception as e:
                logger.error(f"Error in background processing: {e}")
                await asyncio.sleep(1)  # Brief pause before retrying

    def stop_processing(self):
        """Stop the background processing."""
        self.is_running = False
        self.executor.shutdown(wait=True)
        logger.info("Stopped background document processing service")

    async def enqueue_document(self, raw_document_id: int, agent_id: int, domain: str = "general"):
        """Add a document to the processing queue."""
        task = {
            'raw_document_id': raw_document_id,
            'agent_id': agent_id,
            'domain': domain
        }
        await self.processing_queue.put(task)
        logger.info(f"Enqueued document {raw_document_id} for processing")

    def _process_document_task(self, task: Dict[str, Any]):
        """Process a single document through all lakehouse layers."""
        try:
            raw_id = task['raw_document_id']
            agent_id = task['agent_id']
            domain = task['domain']

            logger.info(f"Processing document {raw_id} for agent {agent_id}")

            # Step 1: Raw -> Bronze
            bronze_id = self.semantic_service.process_to_bronze(raw_id)
            logger.info(f"Document {raw_id} moved to bronze layer (ID: {bronze_id})")

            # Step 2: Bronze -> Silver
            silver_id = self.semantic_service.process_to_silver(bronze_id, domain)
            logger.info(f"Document {bronze_id} moved to silver layer (ID: {silver_id})")

            # Step 3: Silver -> Gold
            gold_id = self.semantic_service.process_to_gold(silver_id, agent_id)
            logger.info(f"Document {silver_id} moved to gold layer (ID: {gold_id})")

            logger.info(f"Document {raw_id} fully processed for agent {agent_id}")

        except Exception as e:
            logger.error(f"Failed to process document {task.get('raw_document_id', 'unknown')}: {e}")
            # In production, you might want to mark the document as failed or retry

    async def get_queue_status(self) -> Dict[str, Any]:
        """Get the current processing queue status."""
        return {
            'queue_size': self.processing_queue.qsize(),
            'is_running': self.is_running,
            'active_threads': len(self.executor._threads) if hasattr(self.executor, '_threads') else 0
        }

    def get_failed_documents(self) -> List[Dict[str, Any]]:
        """Get documents that failed processing (placeholder for future implementation)."""
        # This would require additional error tracking tables
        return []

    def retry_failed_documents(self, document_ids: List[int]):
        """Retry processing for failed documents (placeholder)."""
        # Implementation would depend on error tracking
        pass