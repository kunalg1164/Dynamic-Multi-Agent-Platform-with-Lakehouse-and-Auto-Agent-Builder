import duckdb
from typing import List, Dict, Any
import os

class DuckDBAnalytics:
    def __init__(self, db_path: str = "analytics.db"):
        self.db_path = db_path
        self.conn = duckdb.connect(self.db_path)

    def execute_query(self, sql: str) -> List[Dict[str, Any]]:
        """Execute a SQL query and return results as list of dicts."""
        result = self.conn.execute(sql).fetchall()
        columns = [desc[0] for desc in self.conn.description]
        return [dict(zip(columns, row)) for row in result]

    def create_table_from_csv(self, table_name: str, csv_path: str, schema: str = ""):
        """Create a table from CSV file."""
        if schema:
            self.conn.execute(f"CREATE TABLE {table_name} ({schema})")
            self.conn.execute(f"COPY {table_name} FROM '{csv_path}' (HEADER)")
        else:
            self.conn.execute(f"CREATE TABLE {table_name} AS SELECT * FROM read_csv_auto('{csv_path}')")

    def get_table_schema(self, table_name: str) -> str:
        """Get the schema of a table."""
        result = self.conn.execute(f"DESCRIBE {table_name}").fetchall()
        return "\n".join([f"{row[0]}: {row[1]}" for row in result])

    def list_tables(self) -> List[str]:
        """List all tables in the database."""
        result = self.conn.execute("SHOW TABLES").fetchall()
        return [row[0] for row in result]

    def close(self):
        self.conn.close()