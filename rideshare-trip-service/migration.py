# migrate.py
from utils.database import init_database
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

if __name__ == "__main__":
    print("Starting database migration...")
    init_database()
    print("Database ready.")