# File Handling in PocketBase

## Overview

PocketBase provides comprehensive file handling capabilities:
- Single and multi-file uploads
- Automatic image thumbnail generation
- File type restrictions
- Size limits
- Public and private file access
- CDN integration support
- Image resizing and optimization

## File Fields

Add file fields to collections via the Admin UI or API:

```json
{
  "name": "avatar",
  "type": "file",
  "options": {
    "maxSelect": 1,
    "maxSize": 10485760,
    "mimeTypes": ["image/*"],
    "thumbs": ["100x100", "300x300"]
  }
}
```

### File Field Options

#### maxSelect
Maximum number of files allowed:
- `1` - Single file upload
- `null` or `2+` - Multiple files

```json
"maxSelect": 5  // Allow up to 5 files
```

#### maxSize
Maximum file size in bytes:

```json
"maxSize": 10485760  // 10MB

// Common sizes:
5MB = 5242880
10MB = 10485760
50MB = 52428800
100MB = 104857600
```

#### mimeTypes
Allowed MIME types (array):

```json
// Images only
"mimeTypes": ["image/jpeg", "image/png", "image/gif"]

// Images and videos
"mimeTypes": ["image/*", "video/*"]

// Any file type
"mimeTypes": ["*"]

// Specific types
"mimeTypes": [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "text/csv"
]
```

#### thumbs
Auto-generate image thumbnails:

```json
"thumbs": [
  "100x100",    // Small square
  "300x300",    // Medium square
  "800x600",    // Large thumbnail
  "1200x800"    // Extra large
]

// Formats:
// WIDTHxHEIGHT - exact size, may crop
// WIDTHx - width only, maintain aspect ratio
// xHEIGHT - height only, maintain aspect ratio
```

## Uploading Files

### Single File Upload

```javascript
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);

const user = await pb.collection('users').update('USER_ID', formData);

// Access file URL
const avatarUrl = pb.files.getURL(user, user.avatar);
console.log(avatarUrl);
```

### Multiple File Upload

```javascript
const formData = new FormData();

// Add multiple files
formData.append('images', fileInput.files[0]);
formData.append('images', fileInput.files[1]);
formData.append('images', fileInput.files[2]);

const post = await pb.collection('posts').update('POST_ID', formData);

// Access all files
post.images.forEach(image => {
  const url = pb.files.getURL(post, image);
  console.log(url);
});
```

### Upload with Metadata

```javascript
const formData = new FormData();
formData.append('document', fileInput.files[0], {
  filename: 'custom-name.pdf',  // Custom filename
  type: 'application/pdf',
  lastModified: Date.now()
});

const record = await pb.collection('documents').update('DOC_ID', formData);
```

## File URLs

### Get File URL

```javascript
// Basic URL
const url = pb.files.getURL(record, record.avatar);

// With thumbnail
const thumbnailUrl = pb.files.getURL(
  record,
  record.avatar,
  { thumb: '300x300' }
);

// Custom options
const url = pb.files.getURL(
  record,
  record.avatar,
  {
    thumb: '100x100',
    expires: 3600  // URL expires in 1 hour (for private files)
  }
);
```

### URL Parameters

**For public files:**
```javascript
// Direct access (public files only)
const url = pb.files.getURL(record, record.avatar);
// Returns: http://localhost:8090/api/files/COLLECTION_ID/RECORD_ID/filename.jpg
```

**For private files:**
```javascript
// Temporary signed URL (1 hour expiry)
const url = pb.files.getURL(record, record.avatar, { expires: 3600 });
// Returns: http://localhost:8090/api/files/COLLECTION_ID/RECORD_ID/filename.jpg?token=SIGNED_TOKEN
```

**Thumbnail URLs:**
```javascript
// Automatic thumbnail
const thumbUrl = pb.files.getURL(record, record.avatar, {
  thumb: '300x300'
});
// Returns: thumbnail if available
```

## File Access Control

### Public Files
Default behavior - anyone with URL can access:

```javascript
// File is publicly accessible
const url = pb.files.getURL(record, record.avatar);
// Can be shared and accessed by anyone
```

### Private Files
Restrict access to authenticated users:

**1. Configure in Admin UI**
- Go to Collection → File field options
- Enable "Private files"
- Set file rules (e.g., `user_id = @request.auth.id`)

**2. Use signed URLs**
```javascript
// Generate signed URL (expires)
const signedUrl = pb.files.getURL(record, record.avatar, {
  expires: 3600  // Expires in 1 hour
});

// Use signed URL in frontend
<img src={signedUrl} alt="Avatar" />
```

**3. Access files with auth token**
```javascript
// Include auth token in requests
const response = await fetch(signedUrl, {
  headers: {
    'Authorization': `Bearer ${pb.authStore.token}`
  }
});
```

### File Rules

Control who can upload/view/delete files:

```javascript
// Owner can only access their files
File Rule: user_id = @request.auth.id

// Public read, authenticated write
List Rule: true
View Rule: true
Create Rule: @request.auth.id != ""
Update Rule: user_id = @request.auth.id
Delete Rule: user_id = @request.auth.id

// Admins only
Create Rule: @request.auth.role = "admin"
Update Rule: @request.auth.role = "admin"
Delete Rule: @request.auth.role = "admin"
```

## Download Files

### Browser Download

```javascript
// Download via browser
const link = document.createElement('a');
link.href = pb.files.getURL(record, record.document);
link.download = record.document;
link.click();
```

### Programmatic Download

```javascript
// Fetch file as blob
const blob = await pb.files.download(record, record.document);

// Or with fetch
const response = await fetch(pb.files.getURL(record, record.document));
const blob = await response.blob();

// Save file
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = record.document;
a.click();
```

## Deleting Files

### Delete Single File

```javascript
// Remove file from record
const updated = await pb.collection('users').update('USER_ID', {
  avatar: null  // Remove avatar
});
```

### Delete Multiple Files

```javascript
// Remove specific files from array
const updated = await pb.collection('posts').update('POST_ID', {
  images: record.images.filter(img => img !== imageToRemove)
});
```

### Delete File on Record Delete

Files are automatically deleted when record is deleted:

```javascript
await pb.collection('posts').delete('POST_ID');
// All associated files are removed automatically
```

## Image Thumbnails

### Automatic Thumbnails

Define in file field options:

```json
{
  "name": "images",
  "type": "file",
  "options": {
    "maxSelect": 10,
    "maxSize": 10485760,
    "mimeTypes": ["image/*"],
    "thumbs": ["100x100", "300x300", "800x600"]
  }
}
```

### Access Thumbnails

```javascript
// Get specific thumbnail size
const smallThumb = pb.files.getURL(post, post.images[0], {
  thumb: '100x100'
});

const mediumThumb = pb.files.getURL(post, post.images[0], {
  thumb: '300x300'
});

// Auto-select best thumbnail
const thumb = pb.files.getURL(post, post.images[0], {
  thumb: '300x300'  // Returns thumbnail or original if not available
});
```

### Thumbnail Formats

- `WxH` - Crop to exact dimensions
- `Wx` - Width only, maintain aspect ratio
- `xH` - Height only, maintain aspect ratio
- `Wx0` - Width, no height limit
- `0xH` - Height, no width limit

## Frontend Integration

### React Image Component

```javascript
import { useState } from 'react';

function ImageUpload() {
  const [file, setFile] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState('');

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    const updated = await pb.collection('users').update('USER_ID', formData);
    setUploadedUrl(pb.files.getURL(updated, updated.avatar));
  };

  return (
    <div>
      <input type="file" onChange={handleUpload} />
      {uploadedUrl && <img src={uploadedUrl} alt="Avatar" />}
    </div>
  );
}
```

### Vue.js File Upload

```javascript
<template>
  <div>
    <input type="file" @change="handleUpload" />
    <img v-if="uploadedUrl" :src="uploadedUrl" alt="Avatar" />
  </div>
</template>

<script>
export default {
  data() {
    return {
      uploadedUrl: ''
    }
  },
  methods: {
    async handleUpload(e) {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('avatar', file);

      const updated = await pb.collection('users').update('USER_ID', formData);
      this.uploadedUrl = pb.files.getURL(updated, updated.avatar);
    }
  }
}
</script>
```

### Vanilla JavaScript

```html
<input type="file" id="fileInput" />
<img id="preview" />

<script>
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('avatar', file);

  const updated = await pb.collection('users').update('USER_ID', formData);
  const avatarUrl = pb.files.getURL(updated, updated.avatar);

  preview.src = avatarUrl;
});
</script>
```

## File Validation

### Client-Side Validation

```javascript
function validateFile(file) {
  const maxSize = 10485760; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

  if (file.size > maxSize) {
    alert('File too large. Max size is 10MB.');
    return false;
  }

  if (!allowedTypes.includes(file.type)) {
    alert('Invalid file type. Only images allowed.');
    return false;
  }

  return true;
}

// Usage
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (validateFile(file)) {
    // Proceed with upload
  }
});
```

### Server-Side Validation

Configure in file field options:
- Max file size
- Allowed MIME types
- File access rules

## CDN Integration

### Using External CDN

```javascript
// PocketBase behind CDN
const pb = new PocketBase('https://cdn.yoursite.com');

// Or proxy files through CDN
const cdnUrl = `https://cdn.yoursite.com${pb.files.getURL(record, record.avatar)}`;
```

### Cloudflare R2 / AWS S3

PocketBase can work with S3-compatible storage:

```javascript
// In production config
export default {
  dataDir: '/path/to/data',
  // S3 configuration
  s3: {
    endpoint: 'https://s3.amazonaws.com',
    bucket: 'your-bucket',
    region: 'us-east-1',
    accessKey: 'YOUR_KEY',
    secretKey: 'YOUR_SECRET'
  }
}
```

## File Storage Locations

### Local Storage

Default - files stored in `pb_data/db/files/`:

```bash
pb_data/
  db/
    files/
      collection_id/
        record_id/
          filename1.jpg
          filename2.png
```

### Cloud Storage

Configure in `pocketbase.js` config:

```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090', {
  files: {
    // S3 or S3-compatible
    endpoint: 'https://your-s3-endpoint',
    bucket: 'your-bucket',
    region: 'your-region',
    accessKey: 'your-access-key',
    secretKey: 'your-secret-key'
  }
});
```

## File Metadata

### Access File Information

```javascript
const post = await pb.collection('posts').getOne('POST_ID');

// File objects contain:
{
  "@collectionId": "...",
  "@collectionName": "...",
  "id": "file-id",
  "name": "filename.jpg",
  "title": "Original filename",
  "size": 1048576,           // File size in bytes
  "type": "image/jpeg",       // MIME type
  "width": 1920,              // Image width (if image)
  "height": 1080,             // Image height (if image)
  "created": "2024-01-01T00:00:00.000Z",
  "updated": "2024-01-01T00:00:00.000Z"
}
```

### Custom File Metadata

Store additional file information:

```javascript
// When uploading
const formData = new FormData();
formData.append('document', file);
formData.append('description', 'My document');  // Custom field

const record = await pb.collection('documents').create(formData);

// Access later
console.log(record.description);
```

## Progress Tracking

### Upload with Progress

```javascript
function uploadWithProgress(file, onProgress) {
  const xhr = new XMLHttpRequest();

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percentComplete = (e.loaded / e.total) * 100;
      onProgress(percentComplete);
    }
  });

  xhr.addEventListener('load', async () => {
    if (xhr.status === 200) {
      const response = JSON.parse(xhr.responseText);
      // Handle success
    }
  });

  const formData = new FormData();
  formData.append('avatar', file);

  xhr.open('PATCH', `${pb.baseUrl}/api/collections/users/records/USER_ID`);
  xhr.send(formData);
}

// Usage
uploadWithProgress(file, (progress) => {
  console.log(`Upload progress: ${progress}%`);
});
```

## Security Best Practices

### 1. Set File Size Limits
```json
"maxSize": 10485760  // 10MB
```

### 2. Restrict MIME Types
```json
"mimeTypes": ["image/jpeg", "image/png"]  // Specific types only
```

### 3. Use Private Files for Sensitive Data
- Enable "Private files" option
- Use signed URLs with expiration
- Implement proper file rules

### 4. Validate File Content
```javascript
// Check file type
if (!file.type.startsWith('image/')) {
  throw new Error('Only images allowed');
}

// Check file extension
const validExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
if (!validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
  throw new Error('Invalid file extension');
}
```

### 5. Sanitize Filenames
```javascript
// Remove special characters
const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');

// Generate unique filename
const uniqueName = `${Date.now()}_${sanitizedName}`;
```

### 6. Implement File Rules
```javascript
// Only owners can upload
File Rule: user_id = @request.auth.id

// Public read, authenticated write
File Rule: @request.auth.id != ""
```

### 7. Monitor File Usage
- Track storage usage
- Monitor for abuse
- Set up alerts for unusual activity

## Common Use Cases

### User Avatars
```json
{
  "name": "avatar",
  "type": "file",
  "options": {
    "maxSelect": 1,
    "maxSize": 5242880,
    "mimeTypes": ["image/*"],
    "thumbs": ["100x100", "300x300"]
  }
}
```

### Document Storage
```json
{
  "name": "documents",
  "type": "file",
  "options": {
    "maxSelect": 10,
    "maxSize": 52428800,
    "mimeTypes": ["application/pdf", "text/*", "application/msword"]
  }
}
```

### Product Images
```json
{
  "name": "images",
  "type": "file",
  "options": {
    "maxSelect": 10,
    "maxSize": 10485760,
    "mimeTypes": ["image/*"],
    "thumbs": ["300x300", "800x800"]
  }
}
```

### Media Gallery
```json
{
  "name": "media",
  "type": "file",
  "options": {
    "maxSelect": 50,
    "maxSize": 104857600,
    "mimeTypes": ["image/*", "video/*"]
  }
}
```

## Troubleshooting

**Upload fails with 413 (Payload Too Large)**
- File exceeds maxSize limit
- Increase maxSize in field options
- Or split large file into smaller chunks

**File type rejected**
- Check mimeTypes in field options
- Verify actual file type (not just extension)
- Update allowed types

**Private file returns 403**
- Ensure user is authenticated
- Use signed URL with expiration
- Check file rules allow access

**Thumbnail not generating**
- Verify file is an image
- Check thumbs array in field options
- Ensure PocketBase has GD/ImageMagick extension

**Slow file uploads**
- Check network connection
- Reduce file size
- Use CDN for large files
- Enable compression

## Related Topics

- [Collections](collections.md) - File field configuration
- [Authentication](authentication.md) - User file access
- [API Files](../api_files.md) - File API endpoints
- [Security Rules](../security_rules.md) - File access control
- [Going to Production](going_to_production.md) - Production file storage
