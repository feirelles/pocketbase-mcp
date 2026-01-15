# Files API

## Overview

The Files API provides endpoints for file upload, download, thumbnail generation, and file management.

## File Upload

### Single File Upload

```http
POST /api/collections/{collection}/records/{recordId}/files/{field}
Content-Type: multipart/form-data

file: (binary)
```

### Multiple Files Upload

```http
POST /api/collections/{collection}/records/{recordId}/files/{field}
Content-Type: multipart/form-data

file: (binary)
file: (binary)
file: (binary)
```

## File URL Generation

### Get File URL

```javascript
const url = pb.files.getURL(record, fileName);
const thumbnailUrl = pb.files.getURL(record, fileName, { thumb: '300x300' });
```

### Signed URLs (Private Files)

```javascript
const signedUrl = pb.files.getURL(record, fileName, { expires: 3600 });
```

## Delete File

```http
DELETE /api/collections/{collection}/records/{recordId}/files/{field}
```

## Download File

```http
GET /api/files/{collectionId}/{recordId}/{fileName}
```

---

**Note:** This is a placeholder file. See [core/files_handling.md](../core/files_handling.md) for comprehensive file handling documentation.
