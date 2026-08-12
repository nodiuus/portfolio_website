!/bin/bash

set -e

echo "Stopping old container..."
docker rm -f portfolio 2>/dev/null || true

echo "Building image..."
docker build -t portfolio .

echo "Starting container..."
docker run -d \
	--name portfolio \
		-p 80:80 \
			portfolio

			echo "Deployment complete."
