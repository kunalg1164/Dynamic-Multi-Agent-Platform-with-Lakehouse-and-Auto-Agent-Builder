import csv
import os
from typing import List, Dict
from ..services.duckdb_analytics import DuckDBAnalytics

class FinanceDataIngestion:
    def __init__(self, analytics: DuckDBAnalytics):
        self.analytics = analytics

    def load_sample_stock_data(self):
        """Load sample stock price data into DuckDB."""
        # Create sample data if not exists
        sample_data = [
            ["AAPL", "2023-01-01", 150.0, 155.0, 148.0, 152.0, 1000000],
            ["AAPL", "2023-01-02", 152.0, 158.0, 150.0, 155.0, 1200000],
            ["GOOGL", "2023-01-01", 2800.0, 2850.0, 2780.0, 2820.0, 500000],
            ["GOOGL", "2023-01-02", 2820.0, 2880.0, 2800.0, 2850.0, 600000],
            ["MSFT", "2023-01-01", 300.0, 310.0, 295.0, 305.0, 800000],
            ["MSFT", "2023-01-02", 305.0, 315.0, 300.0, 310.0, 900000],
        ]

        # Create table
        schema = """
        symbol VARCHAR,
        date DATE,
        open_price DOUBLE,
        high_price DOUBLE,
        low_price DOUBLE,
        close_price DOUBLE,
        volume INTEGER
        """
        self.analytics.conn.execute(f"CREATE TABLE IF NOT EXISTS stock_prices ({schema})")

        # Insert sample data
        for row in sample_data:
            self.analytics.conn.execute("""
                INSERT INTO stock_prices VALUES (?, ?, ?, ?, ?, ?, ?)
            """, row)

        print("Sample stock data loaded.")

    def get_sample_data_status(self) -> Dict[str, bool]:
        """Check if sample data is loaded."""
        tables = self.analytics.list_tables()
        return {
            "stock_prices_loaded": "stock_prices" in tables
        }