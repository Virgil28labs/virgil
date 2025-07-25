#!/bin/bash

# Update remaining UI date formatting to use TimeService

echo "Updating UI components date formatting..."

# Update NasaApodModal
echo "Processing NasaApodModal..."
sed -i.bak "/import { useNasaApod } from '\.\.\/\.\.\/hooks\/useNasaApod';/a\\
import { timeService } from '../../services/TimeService';" src/components/nasa/NasaApodModal.tsx

# Update NasaApodGallery  
echo "Processing NasaApodGallery..."
sed -i.bak "/import { LoadingOverlay } from '\.\.\/common\/LoadingOverlay';/a\\
import { timeService } from '../../services/TimeService';" src/components/nasa/NasaApodGallery.tsx

# Update WeatherForecast
echo "Processing WeatherForecast..."
sed -i.bak "/import '\.\/WeatherForecast\.css';/a\\
import { timeService } from '../services/TimeService';" src/components/WeatherForecast.tsx

# Update PhotoModal
echo "Processing PhotoModal..."
sed -i.bak "/import { toastService } from '\.\.\/\.\.\/services\/ToastService';/a\\
import { timeService } from '../../services/TimeService';" src/components/camera/PhotoModal.tsx

# Clean up backup files
rm -f src/components/**/*.bak

echo "Import updates complete!"