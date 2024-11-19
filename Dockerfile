# Use an official Python runtime as the base image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements files
COPY requirements.txt ./

# Install the project dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY src .

# Expose the port the app runs on (FastAPI default is 8000)
EXPOSE 8000

ENV LOG_LEVEL=ERROR

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
