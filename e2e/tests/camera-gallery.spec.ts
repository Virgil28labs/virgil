/**
 * Camera and Photo Gallery E2E Tests
 * 
 * Tests the camera functionality and photo gallery including:
 * - Camera permissions and access
 * - Photo capture and preview
 * - Photo gallery management
 * - Upload and download
 * - Photo metadata
 * - Error handling
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import * as path from 'path';

test.describe('Camera and Photo Gallery', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page, context }) => {
    helpers = new TestHelpers(page);
    
    // Set up authenticated state
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-access-token',
        domain: 'localhost',
        path: '/',
        expires: Date.now() / 1000 + 3600,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    // Grant camera permission
    await context.grantPermissions(['camera']);
    
    // Mock camera API
    await mockCameraAPI(page);
    
    await page.goto('/dashboard');
    await helpers.waitForAppReady();
  });

  test('should open camera and capture photo', async ({ page, browserName }) => {
    // Skip on browsers with camera issues
    test.skip(browserName === 'webkit', 'Camera tests unreliable in WebKit');
    
    // Click camera widget
    const cameraWidget = page.locator('[data-testid="camera-widget"]');
    await cameraWidget.click();
    
    // Verify camera modal opens
    const cameraModal = page.locator('[data-testid="camera-modal"]');
    await expect(cameraModal).toBeVisible();
    
    // Mock getUserMedia
    await page.evaluate(() => {
      const mockStream = {
        getTracks: () => [{
          stop: () => {},
          kind: 'video',
        }],
        getVideoTracks: () => [{
          getSettings: () => ({
            width: 1280,
            height: 720,
            facingMode: 'user',
          }),
        }],
      };
      
      navigator.mediaDevices.getUserMedia = async () => mockStream;
    });
    
    // Wait for camera stream
    const cameraVideo = cameraModal.locator('[data-testid="camera-video"]');
    await expect(cameraVideo).toBeVisible();
    
    // Verify camera controls
    await expect(cameraModal.locator('[data-testid="capture-button"]')).toBeVisible();
    await expect(cameraModal.locator('[data-testid="switch-camera"]')).toBeVisible();
    await expect(cameraModal.locator('[data-testid="camera-settings"]')).toBeVisible();
    
    // Capture photo
    const captureButton = cameraModal.locator('[data-testid="capture-button"]');
    await captureButton.click();
    
    // Verify capture animation
    await expect(cameraModal.locator('[data-testid="capture-flash"]')).toBeVisible();
    
    // Verify preview screen
    const photoPreview = cameraModal.locator('[data-testid="photo-preview"]');
    await expect(photoPreview).toBeVisible();
    
    // Verify preview controls
    await expect(cameraModal.locator('[data-testid="save-photo"]')).toBeVisible();
    await expect(cameraModal.locator('[data-testid="retake-photo"]')).toBeVisible();
    await expect(cameraModal.locator('[data-testid="download-photo"]')).toBeVisible();
    
    // Add metadata
    const captionInput = cameraModal.locator('[data-testid="photo-caption"]');
    await helpers.typeWithDelay('[data-testid="photo-caption"]', 'Test photo from E2E');
    
    // Add tags
    const tagInput = cameraModal.locator('[data-testid="photo-tags"]');
    await tagInput.click();
    await tagInput.type('test');
    await page.keyboard.press('Enter');
    await tagInput.type('e2e');
    await page.keyboard.press('Enter');
    
    // Verify tags added
    await expect(cameraModal.locator('[data-testid="tag-test"]')).toBeVisible();
    await expect(cameraModal.locator('[data-testid="tag-e2e"]')).toBeVisible();
    
    // Save photo
    await cameraModal.locator('[data-testid="save-photo"]').click();
    
    // Verify success message
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Photo saved');
    
    // Verify modal closes
    await expect(cameraModal).not.toBeVisible();
  });

  test('should handle camera permission denial', async ({ page, context }) => {
    // Deny camera permission
    await context.clearPermissions();
    
    // Click camera widget
    await page.locator('[data-testid="camera-widget"]').click();
    
    // Verify permission prompt
    const cameraModal = page.locator('[data-testid="camera-modal"]');
    await expect(cameraModal).toBeVisible();
    
    const permissionPrompt = cameraModal.locator('[data-testid="camera-permission-denied"]');
    await expect(permissionPrompt).toBeVisible();
    await expect(permissionPrompt).toContainText('Camera access denied');
    
    // Verify instructions
    await expect(permissionPrompt.locator('[data-testid="permission-instructions"]')).toBeVisible();
    
    // Verify settings button
    const settingsButton = permissionPrompt.locator('[data-testid="open-settings"]');
    await expect(settingsButton).toBeVisible();
  });

  test('should switch between cameras', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Camera tests unreliable in WebKit');
    
    // Open camera
    await page.locator('[data-testid="camera-widget"]').click();
    
    // Mock multiple cameras
    await page.evaluate(() => {
      navigator.mediaDevices.enumerateDevices = async () => [
        { kind: 'videoinput', deviceId: 'camera1', label: 'Front Camera' },
        { kind: 'videoinput', deviceId: 'camera2', label: 'Back Camera' },
      ];
    });
    
    // Wait for camera
    const cameraModal = page.locator('[data-testid="camera-modal"]');
    await expect(cameraModal.locator('[data-testid="camera-video"]')).toBeVisible();
    
    // Verify switch button is visible
    const switchButton = cameraModal.locator('[data-testid="switch-camera"]');
    await expect(switchButton).toBeVisible();
    
    // Switch camera
    await switchButton.click();
    
    // Verify camera switched (check for indicator)
    await expect(cameraModal.locator('[data-testid="camera-indicator"]')).toContainText('Back Camera');
    
    // Switch back
    await switchButton.click();
    await expect(cameraModal.locator('[data-testid="camera-indicator"]')).toContainText('Front Camera');
  });

  test('should access and manage photo gallery', async ({ page }) => {
    // Navigate to gallery
    await page.goto('/gallery');
    await helpers.waitForAppReady();
    
    // Verify gallery loaded
    const gallery = page.locator('[data-testid="photo-gallery"]');
    await expect(gallery).toBeVisible();
    
    // Verify photos loaded
    const photos = await gallery.locator('[data-testid="gallery-photo"]').all();
    expect(photos.length).toBeGreaterThan(0);
    
    // Test gallery views
    const viewToggle = page.locator('[data-testid="gallery-view-toggle"]');
    
    // Switch to list view
    await viewToggle.locator('[data-testid="view-list"]').click();
    await expect(gallery).toHaveClass(/list-view/);
    
    // Switch to grid view
    await viewToggle.locator('[data-testid="view-grid"]').click();
    await expect(gallery).toHaveClass(/grid-view/);
    
    // Test sorting
    const sortDropdown = page.locator('[data-testid="gallery-sort"]');
    await sortDropdown.click();
    
    // Sort by oldest
    await page.locator('[data-testid="sort-oldest"]').click();
    
    // Verify sort applied
    const firstPhoto = gallery.locator('[data-testid="gallery-photo"]').first();
    const firstPhotoDate = await firstPhoto.getAttribute('data-date');
    const lastPhoto = gallery.locator('[data-testid="gallery-photo"]').last();
    const lastPhotoDate = await lastPhoto.getAttribute('data-date');
    
    expect(new Date(firstPhotoDate!).getTime()).toBeLessThan(new Date(lastPhotoDate!).getTime());
  });

  test('should view photo details and metadata', async ({ page }) => {
    // Navigate to gallery
    await page.goto('/gallery');
    await helpers.waitForAppReady();
    
    // Click first photo
    const firstPhoto = page.locator('[data-testid="gallery-photo"]').first();
    await firstPhoto.click();
    
    // Verify photo viewer opens
    const photoViewer = page.locator('[data-testid="photo-viewer"]');
    await expect(photoViewer).toBeVisible();
    
    // Verify photo displayed
    await expect(photoViewer.locator('[data-testid="photo-full"]')).toBeVisible();
    
    // Verify metadata panel
    const metadataPanel = photoViewer.locator('[data-testid="photo-metadata"]');
    await expect(metadataPanel).toBeVisible();
    
    // Check metadata fields
    await expect(metadataPanel.locator('[data-testid="photo-date"]')).toBeVisible();
    await expect(metadataPanel.locator('[data-testid="photo-size"]')).toBeVisible();
    await expect(metadataPanel.locator('[data-testid="photo-dimensions"]')).toBeVisible();
    
    // Check caption and tags if present
    const caption = metadataPanel.locator('[data-testid="photo-caption-display"]');
    if (await caption.isVisible()) {
      expect(await caption.textContent()).toBeTruthy();
    }
    
    // Test navigation
    const nextButton = photoViewer.locator('[data-testid="photo-next"]');
    await nextButton.click();
    
    // Verify different photo loaded
    await expect(photoViewer.locator('[data-testid="photo-index"]')).toContainText('2');
    
    // Test keyboard navigation
    await page.keyboard.press('ArrowLeft');
    await expect(photoViewer.locator('[data-testid="photo-index"]')).toContainText('1');
    
    // Close viewer
    await page.keyboard.press('Escape');
    await expect(photoViewer).not.toBeVisible();
  });

  test('should upload photos to gallery', async ({ page }) => {
    // Navigate to gallery
    await page.goto('/gallery');
    await helpers.waitForAppReady();
    
    // Click upload button
    const uploadButton = page.locator('[data-testid="upload-photos"]');
    await uploadButton.click();
    
    // Set up file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-testid="file-input"]').click();
    
    const fileChooser = await fileChooserPromise;
    
    // Create test image file path
    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
    
    // Select file
    await fileChooser.setFiles(testImagePath);
    
    // Verify preview
    const uploadModal = page.locator('[data-testid="upload-modal"]');
    await expect(uploadModal).toBeVisible();
    await expect(uploadModal.locator('[data-testid="upload-preview"]')).toBeVisible();
    
    // Add metadata
    await helpers.typeWithDelay('[data-testid="upload-caption"]', 'Uploaded test image');
    
    // Start upload
    await uploadModal.locator('[data-testid="start-upload"]').click();
    
    // Verify progress
    await expect(uploadModal.locator('[data-testid="upload-progress"]')).toBeVisible();
    
    // Wait for completion
    await expect(uploadModal.locator('[data-testid="upload-complete"]')).toBeVisible({ timeout: 10000 });
    
    // Close modal
    await uploadModal.locator('[data-testid="close-upload"]').click();
    
    // Verify photo appears in gallery
    const latestPhoto = page.locator('[data-testid="gallery-photo"]').first();
    await expect(latestPhoto).toHaveAttribute('data-caption', 'Uploaded test image');
  });

  test('should delete photos from gallery', async ({ page }) => {
    // Navigate to gallery
    await page.goto('/gallery');
    await helpers.waitForAppReady();
    
    // Get initial photo count
    const initialPhotos = await page.locator('[data-testid="gallery-photo"]').count();
    
    // Enter selection mode
    const selectButton = page.locator('[data-testid="select-photos"]');
    await selectButton.click();
    
    // Verify selection mode active
    await expect(page.locator('[data-testid="selection-toolbar"]')).toBeVisible();
    
    // Select first photo
    const firstPhoto = page.locator('[data-testid="gallery-photo"]').first();
    await firstPhoto.locator('[data-testid="photo-checkbox"]').click();
    
    // Verify selection count
    await expect(page.locator('[data-testid="selection-count"]')).toContainText('1 selected');
    
    // Click delete
    await page.locator('[data-testid="delete-selected"]').click();
    
    // Confirm deletion
    const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText('Delete 1 photo?');
    
    await confirmDialog.locator('[data-testid="confirm-delete"]').click();
    
    // Verify deletion progress
    await expect(page.locator('[data-testid="delete-progress"]')).toBeVisible();
    
    // Verify photo removed
    await expect(page.locator('[data-testid="gallery-photo"]')).toHaveCount(initialPhotos - 1);
    
    // Verify success message
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('1 photo deleted');
  });

  test('should download photos', async ({ page }) => {
    // Navigate to gallery
    await page.goto('/gallery');
    await helpers.waitForAppReady();
    
    // Open first photo
    await page.locator('[data-testid="gallery-photo"]').first().click();
    
    // Set up download promise
    const downloadPromise = page.waitForEvent('download');
    
    // Click download
    const photoViewer = page.locator('[data-testid="photo-viewer"]');
    await photoViewer.locator('[data-testid="download-photo"]').click();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.(jpg|jpeg|png)$/i);
    
    // Clean up
    await download.delete();
  });

  test('should search photos by caption and tags', async ({ page }) => {
    // Navigate to gallery
    await page.goto('/gallery');
    await helpers.waitForAppReady();
    
    // Open search
    const searchButton = page.locator('[data-testid="search-photos"]');
    await searchButton.click();
    
    // Verify search bar
    const searchBar = page.locator('[data-testid="photo-search-bar"]');
    await expect(searchBar).toBeVisible();
    
    // Search by caption
    await helpers.typeWithDelay('[data-testid="search-input"]', 'sunset');
    
    // Wait for results
    await page.waitForTimeout(500); // Debounce
    
    // Verify filtered results
    const photos = await page.locator('[data-testid="gallery-photo"]').all();
    for (const photo of photos) {
      const caption = await photo.getAttribute('data-caption');
      const tags = await photo.getAttribute('data-tags');
      expect(caption?.toLowerCase() + tags?.toLowerCase()).toContain('sunset');
    }
    
    // Clear search
    await page.locator('[data-testid="clear-search"]').click();
    
    // Search by tag
    await page.locator('[data-testid="tag-filter"]').click();
    await page.locator('[data-testid="tag-option-landscape"]').click();
    
    // Verify tag filter applied
    await expect(page.locator('[data-testid="active-filters"]')).toContainText('landscape');
    
    // Verify filtered results have tag
    const taggedPhotos = await page.locator('[data-testid="gallery-photo"]').all();
    for (const photo of taggedPhotos) {
      const tags = await photo.getAttribute('data-tags');
      expect(tags).toContain('landscape');
    }
  });

  test('should handle photo loading states', async ({ page }) => {
    // Mock slow loading
    await page.route('**/storage/v1/object/public/photos/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'image/jpeg',
        body: Buffer.from('fake-image-data'),
      });
    });
    
    // Navigate to gallery
    await page.goto('/gallery');
    
    // Verify loading placeholders
    const placeholders = page.locator('[data-testid="photo-placeholder"]');
    await expect(placeholders.first()).toBeVisible();
    
    // Verify shimmer effect
    await expect(placeholders.first()).toHaveClass(/shimmer/);
    
    // Wait for photos to load
    await expect(page.locator('[data-testid="gallery-photo"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should support batch operations', async ({ page }) => {
    // Navigate to gallery
    await page.goto('/gallery');
    await helpers.waitForAppReady();
    
    // Enter selection mode
    await page.locator('[data-testid="select-photos"]').click();
    
    // Select all
    await page.locator('[data-testid="select-all"]').click();
    
    // Verify all selected
    const totalPhotos = await page.locator('[data-testid="gallery-photo"]').count();
    await expect(page.locator('[data-testid="selection-count"]')).toContainText(`${totalPhotos} selected`);
    
    // Test batch download
    const batchDownloadButton = page.locator('[data-testid="download-selected"]');
    await expect(batchDownloadButton).toBeVisible();
    
    // Test batch tag
    await page.locator('[data-testid="tag-selected"]').click();
    
    const tagModal = page.locator('[data-testid="batch-tag-modal"]');
    await expect(tagModal).toBeVisible();
    
    // Add tag
    await helpers.typeWithDelay('[data-testid="batch-tag-input"]', 'batch-test');
    await page.keyboard.press('Enter');
    
    // Apply tags
    await tagModal.locator('[data-testid="apply-tags"]').click();
    
    // Verify success
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(`Tagged ${totalPhotos} photos`);
  });
});

/**
 * Mock camera and photo APIs
 */
async function mockCameraAPI(page: Page) {
  // Mock photo storage API
  await page.route('**/storage/v1/object/photos/*', async (route) => {
    if (route.request().method() === 'POST') {
      // Upload response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          Key: `photos/${Date.now()}.jpg`,
          url: `https://example.com/photos/${Date.now()}.jpg`,
        }),
      });
    }
  });

  // Mock photo list API
  await page.route('**/api/v1/photos', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          photos: [
            {
              id: 'photo-1',
              url: 'https://example.com/photos/1.jpg',
              thumbnail: 'https://example.com/photos/1-thumb.jpg',
              caption: 'Beautiful sunset',
              tags: ['sunset', 'landscape'],
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              metadata: {
                width: 1920,
                height: 1080,
                size: 1024000,
              },
            },
            {
              id: 'photo-2',
              url: 'https://example.com/photos/2.jpg',
              thumbnail: 'https://example.com/photos/2-thumb.jpg',
              caption: 'City skyline',
              tags: ['city', 'night'],
              createdAt: new Date(Date.now() - 172800000).toISOString(),
              metadata: {
                width: 1920,
                height: 1080,
                size: 2048000,
              },
            },
          ],
        }),
      });
    }
  });

  // Mock photo deletion
  await page.route('**/api/v1/photos/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });
}