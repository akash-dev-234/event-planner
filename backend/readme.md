# How to Run the Flask Application

1. **Navigate to the Root Folder**:
    ```sh
    cd /event-planner
    ```

2. **Run the Application**:
    ```sh
    python -m backend.app
    ```

   Make sure you have all the necessary dependencies installed and your virtual environment activated before running the application.

# Database Migrations

When you modify your SQLAlchemy models (e.g., adding new columns), you need to run migrations to update the database schema. Follow these steps to handle migrations using Flask-Migrate:

## Step 1: Create a Migration

1. **Make Changes to Your Models**:
   Modify your SQLAlchemy models as needed (e.g., adding a new column).

2. **Create a Migration**:
   After making changes to your models, create a migration script by running the following command:

   ```bash
   flask --app backend.app db migrate -m "Description of changes"
   ```

   This command generates a new migration script in the `backend/migrations/versions` directory.

## Step 2: Review the Migration

1. **Open the Migration File**:
   Navigate to the `backend/migrations/versions` directory and open the newly created migration file.

2. **Review Changes**:
   Ensure that the migration file accurately reflects the modifications you made to your models.

## Step 3: Apply the Migration

1. **Run the Migration**:
   Apply the migration to your database by running:

   ```bash
   flask --app backend.app db upgrade
   ```

   This command updates your database schema according to the migration script.

## Step 4: Push Changes to Version Control

1. **Add Migration Files**:
   After applying the migration, you should commit the migration files and any changes to your models to your version control system (e.g., Git). Here’s how you can do it:

   ```bash
   git add backend/migrations/versions/your_migration_file.py
   git add backend/auth/models.py  # or any other modified files
   git commit -m "Add role column to user model and create logout endpoint"
   git push origin your_branch_name
   ```

2. **Collaborate with Team Members**:
   When other team members pull the latest changes, they will also receive the migration files. They can then run the `flask db upgrade` command to apply the migrations to their local databases.

# Resources Used
- [Flask Tutorial - Authentication using email and password](https://www.youtube.com/watch?v=nZRygaTH2MA)