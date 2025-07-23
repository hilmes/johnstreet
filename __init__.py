# Initialize aiosqlite Database (not yet connected)
logging.info("Initializing database object (aiosqlite)...")
self.db = Database(str(self.config.get_db_path()))
logging.info("Database object created but not connected yet.")