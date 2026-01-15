# Go Overview - PocketBase

## Overview

PocketBase can be extended using Go, allowing you to:
- Add custom API endpoints
- Implement event hooks
- Create custom database migrations
- Build scheduled jobs
- Add custom middleware
- Integrate external services
- Extend authentication

## Project Structure

```
myapp/
├── go.mod
├── pocketbase.go
├── migrations/
│   └── 1703123456_initial.go
├── hooks/
│   └── hooks.go
└── main.go
```

## Creating a Go Extension

### 1. Initialize Go Module

```bash
go mod init myapp
```

### 2. Install PocketBase SDK

```bash
go get github.com/pocketbase/pocketbase@latest
```

### 3. Basic PocketBase App

Create `main.go`:

```go
package main

import (
    "log"
    "net/http"

    "github.com/pocketbase/pocketbase"
    "github.com/pocketbase/pocketbase/core"
)

func main() {
    app := pocketbase.New()

    // Add custom API endpoint
    app.OnServe().BindFunc(func(se *core.ServeEvent) error {
        // Custom routes
        se.Router.GET("/api/hello", func(e *core.RequestEvent) error {
            return e.JSON(200, map[string]string{
                "message": "Hello from Go!",
            })
        })

        return se.Next()
    })

    // Start the app
    if err := app.Start(); err != nil {
        log.Fatal(err)
    }
}
```

### 4. Run the Application

```bash
go run main.go pocketbase.go serve --http=0.0.0.0:8090
```

## Core Concepts

### Event Hooks

Execute code on specific events:

```go
// On record create
app.OnRecordCreate("posts").BindFunc(func(e *core.RecordCreateEvent) error {
    log.Println("Post created:", e.Record.GetString("title"))
    return e.Next()
})

// On record update
app.OnRecordUpdate("posts").BindFunc(func(e *core.RecordUpdateEvent) error {
    log.Println("Post updated:", e.Record.GetString("title"))
    return e.Next()
})

// On record delete
app.OnRecordDelete("posts").BindFunc(func(e *core.RecordDeleteEvent) error {
    log.Println("Post deleted:", e.Record.GetString("title"))
    return e.Next()
})

// On authentication
app.OnRecordAuth().BindFunc(func(e *core.RecordAuthEvent) error {
    log.Println("User authenticated:", e.Record.GetString("email"))
    return e.Next()
})
```

### Event Arguments

PocketBase exposes a different event struct for each hook (see the
[official event hooks reference](https://pocketbase.io/docs/go-event-hooks/)).
Common fields you will interact with include:

- `e.App` – the running PocketBase instance (database access, configuration, cron, etc.).
- `e.Record` – the record being created, updated, deleted, or authenticated.
- `e.RecordOriginal` – the previous value during update hooks.
- `e.Next()` – call to continue the handler chain after your logic.

Refer to the linked docs for the complete list of fields exposed by each event type.

## Custom API Endpoints

### Create GET Endpoint

```go
app.OnServe().BindFunc(func(se *core.ServeEvent) error {
    se.Router.GET("/api/stats", func(e *core.RequestEvent) error {
        totalPosts, err := e.App.CountRecords("posts")
        if err != nil {
            return e.InternalServerError("failed to count posts", err)
        }

        totalUsers, err := e.App.CountRecords("users")
        if err != nil {
            return e.InternalServerError("failed to count users", err)
        }

        return e.JSON(200, map[string]any{
            "total_posts":    totalPosts,
            "total_users":    totalUsers,
            "authenticated":  e.Auth != nil,
        })
    })

    return se.Next()
})
```

### Create POST Endpoint

```go
import "github.com/pocketbase/dbx"

app.OnServe().BindFunc(func(se *core.ServeEvent) error {
    se.Router.POST("/api/search", func(e *core.RequestEvent) error {
        // Parse request body
        var req struct {
            Query string `json:"query"`
        }
        if err := e.BindBody(&req); err != nil {
            return e.BadRequestError("invalid body", err)
        }

        // Search posts with a safe filter
        records, err := e.App.FindRecordsByFilter(
            "posts",
            "title ~ {:query}",
            "-created",
            50,
            0,
            dbx.Params{"query": req.Query},
        )
        if err != nil {
            return e.InternalServerError("Search failed", err)
        }

        return e.JSON(200, map[string]any{
            "results": records,
            "count":   len(records),
        })
    })

    return se.Next()
})
```

### Custom Middleware

```go
app.OnServe().BindFunc(func(se *core.ServeEvent) error {
    se.Router.BindFunc(func(e *core.RequestEvent) error {
        // Add CORS headers
        e.Response.Header().Set("Access-Control-Allow-Origin", "*")
        e.Response.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
        e.Response.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if e.Request.Method == http.MethodOptions {
            return e.NoContent(http.StatusOK)
        }

        return e.Next()
    })

    return se.Next()
})
```

## Database Operations

### Find Records

```go
import "github.com/pocketbase/dbx"

// Find single record
record, err := app.FindRecordById("posts", "RECORD_ID")

// Find multiple records with a filter and pagination
records, err := app.FindRecordsByFilter(
    "posts",
    "status = {:status}",
    "-created",
    50,
    0,
    dbx.Params{"status": "published"},
)

// Custom query with the record query builder
records := []*core.Record{}
err := app.RecordQuery("posts").
    AndWhere(dbx.Like("title", "pocketbase")).
    OrderBy("created DESC").
    Limit(50).
    All(&records)

// Find with relations
record, err = app.FindRecordById("posts", "id")
if err == nil {
    if errs := app.ExpandRecord(record, []string{"author", "comments"}, nil); len(errs) > 0 {
        // handle expand error(s)
    }
}
```

### Create Records

```go
collection, err := app.FindCollectionByNameOrId("posts")
if err != nil {
    return err
}

record := core.NewRecord(collection)
record.Set("title", "My Post")
record.Set("content", "Post content")
record.Set("author", "USER_ID")

if err := app.Save(record); err != nil {
    return err
}
```

### Update Records

```go
record, err := app.FindRecordById("posts", "id")
if err != nil {
    return err
}

record.Set("title", "Updated Title")
record.Set("content", "Updated content")

if err := app.Save(record); err != nil {
    return err
}
```

### Delete Records

```go
record, err := app.FindRecordById("posts", "id")
if err != nil {
    return err
}

if err := app.Delete(record); err != nil {
    return err
}
```

### Query Builder

```go
records := []*core.Record{}
err := app.RecordQuery("posts").
    AndWhere(dbx.HashExp{"status": "published"}).
    AndWhere(dbx.NewExp("created >= {:date}", dbx.Params{"date": "2024-01-01"})).
    OrderBy("created DESC").
    Offset(0).
    Limit(50).
    All(&records)

// Combine conditions with OR
records = []*core.Record{}
err = app.RecordQuery("posts").
    AndWhere(dbx.Or(
        dbx.HashExp{"status": "published"},
        dbx.HashExp{"author": userId},
    )).
    All(&records)
```

## Event Hooks Examples

### Auto-populate Fields

```go
// Auto-set author on post create
app.OnRecordCreateRequest("posts").BindFunc(func(e *core.RecordRequestEvent) error {
    if e.Auth != nil {
        e.Record.Set("author", e.Auth.Id)
    }
    return e.Next()
})

// Auto-set slug from title
app.OnRecordCreate("posts").BindFunc(func(e *core.RecordCreateEvent) error {
    title := e.Record.GetString("title")
    slug := strings.ToLower(strings.ReplaceAll(title, " ", "-"))
    e.Record.Set("slug", slug)
    return e.Next()
})
```

### Validation

```go
// Custom validation
app.OnRecordCreate("posts").BindFunc(func(e *core.RecordCreateEvent) error {
    title := e.Record.GetString("title")
    if len(title) < 5 {
        return errors.New("title must be at least 5 characters")
    }
    return e.Next()
})

// Check permissions
app.OnRecordCreateRequest("posts").BindFunc(func(e *core.RecordRequestEvent) error {
    if e.Auth == nil {
        return e.ForbiddenError("authentication required", nil)
    }

    role := e.Auth.GetString("role")
    if role != "admin" && role != "author" {
        return e.ForbiddenError("insufficient permissions", nil)
    }

    return e.Next()
})
```

### Cascading Updates

```go
// When post is updated, update related comments
app.OnRecordUpdate("posts").BindFunc(func(e *core.RecordUpdateEvent) error {
    // Check if status changed
    oldStatus := e.RecordOriginal.GetString("status")
    newStatus := e.Record.GetString("status")

    if oldStatus != newStatus && newStatus == "published" {
        comments, err := e.App.FindRecordsByFilter(
            "comments",
            "post = {:postId}",
            "",
            0,
            0,
            dbx.Params{"postId": e.Record.Id},
        )
        if err != nil {
            return err
        }

        for _, comment := range comments {
            comment.Set("status", "approved")
            if err := e.App.Save(comment); err != nil {
                return err
            }
        }
    }

    return e.Next()
})
```

### Send Notifications

```go
// Send email when post is published
app.OnRecordUpdate("posts").BindFunc(func(e *core.RecordUpdateEvent) error {
    oldStatus := e.RecordOriginal.GetString("status")
    newStatus := e.Record.GetString("status")

    if oldStatus != "published" && newStatus == "published" {
        author, err := e.App.FindRecordById("users", e.Record.GetString("author"))
        if err == nil {
            log.Println("Sending notification to:", author.GetString("email"))
        }
    }

    return e.Next()
})
```

### Log Activities

```go
// Log all record changes using the builtin logger
app.OnRecordCreate("posts").BindFunc(func(e *core.RecordCreateEvent) error {
    e.App.Logger().Info("post created", "recordId", e.Record.Id)
    return e.Next()
})

app.OnRecordUpdate("posts").BindFunc(func(e *core.RecordUpdateEvent) error {
    e.App.Logger().Info(
        "post updated",
        "recordId", e.Record.Id,
        "statusFrom", e.RecordOriginal.GetString("status"),
        "statusTo", e.Record.GetString("status"),
    )
    return e.Next()
})

app.OnRecordDelete("posts").BindFunc(func(e *core.RecordDeleteEvent) error {
    e.App.Logger().Info("post deleted", "recordId", e.Record.Id)
    return e.Next()
})
```

## Scheduled Jobs

### Create Background Job

```go
// Register job
app.Cron().MustAdd("daily-backup", "0 2 * * *", func() {
    log.Println("Running daily backup...")

    backupDir := "./backups"
    if err := os.MkdirAll(backupDir, 0o755); err != nil {
        log.Println("Backup failed:", err)
        return
    }

    // Your backup logic here
    log.Println("Backup completed")
})

// Or add a job during serve
app.OnServe().BindFunc(func(se *core.ServeEvent) error {
    se.App.Cron().MustAdd("cleanup", "@every 5m", func() {
        log.Println("Running cleanup task...")
        // Cleanup logic
    })

    return se.Next()
})
```

## File Handling

### Custom File Upload

```go
app.OnServe().BindFunc(func(se *core.ServeEvent) error {
    se.Router.POST("/api/upload", func(e *core.RequestEvent) error {
        files, err := e.FindUploadedFiles("file")
        if err != nil {
            return e.BadRequestError("no file uploaded", err)
        }

        collection, err := e.App.FindCollectionByNameOrId("uploads")
        if err != nil {
            return e.NotFoundError("uploads collection not found", err)
        }

        record := core.NewRecord(collection)
        // Attach the uploaded file(s) to a file field
        record.Set("document", files)

        if err := e.App.Save(record, files...); err != nil {
            return e.InternalServerError("failed to save file", err)
        }

        return e.JSON(http.StatusOK, record)
    })

    return se.Next()
})
```

## Custom Auth Provider

```go
// Custom OAuth provider
app.OnRecordAuthWithOAuth2().BindFunc(func(e *core.RecordAuthWithOAuth2Event) error {
    if e.Provider != "custom" {
        return e.Next()
    }

    // Fetch user info from custom provider
    userInfo, err := fetchCustomUserInfo(e.OAuth2UserData)
    if err != nil {
        return err
    }

    // Find or create user
    user, err := e.App.FindAuthRecordByData("users", "email", userInfo.Email)
    if err != nil {
        collection, err := e.App.FindCollectionByNameOrId("users")
        if err != nil {
            return err
        }

        user = core.NewRecord(collection)
        user.Set("email", userInfo.Email)
        user.Set("password", "") // OAuth users don't need password
        user.Set("emailVisibility", false)
        user.Set("verified", true)
        user.Set("name", userInfo.Name)
        if err := e.App.Save(user); err != nil {
            return err
        }
    }

    e.Record = user
    return e.Next()
})
```

## Testing

### Unit Tests

```go
package main

import (
    "testing"

    "github.com/pocketbase/pocketbase"
    "github.com/pocketbase/pocketbase/core"
    "github.com/pocketbase/pocketbase/tests"
)

func TestCustomEndpoint(t *testing.T) {
    app := pocketbase.NewWithConfig(config{})

    // Add test endpoint
    app.OnServe().BindFunc(func(se *core.ServeEvent) error {
        se.Router.GET("/api/test", func(e *core.RequestEvent) error {
            return e.JSON(200, map[string]string{
                "status": "ok",
            })
        })
        return se.Next()
    })

    e := tests.NewRequestEvent(app, nil)
    // Test endpoint
    e.GET("/api/test").Expect(t).Status(200).JSON().Equal(map[string]interface{}{
        "status": "ok",
    })
}
```

### Integration Tests

```go
func TestRecordCreation(t *testing.T) {
    app := pocketbase.New()
    app.MustSeed()

    client := tests.NewClient(app)

    // Test authenticated request
    auth := client.AuthRecord("users", "test@example.com", "password")
    post := client.CreateRecord("posts", map[string]interface{}{
        "title":   "Test Post",
        "content": "Test content",
    }, auth.Token)

    if post.GetString("title") != "Test Post" {
        t.Errorf("Expected title 'Test Post', got %s", post.GetString("title"))
    }
}
```

## Deployment

### Build and Run

```bash
# Build
go build -o myapp main.go

# Run
./myapp serve --http=0.0.0.0:8090
```

### Docker Deployment

```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY . .
RUN go mod download
RUN go build -o myapp main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/myapp .
COPY --from=builder /app/pocketbase ./

CMD ["./myapp", "serve", "--http=0.0.0.0:8090"]
```

## Best Practices

### 1. Error Handling

```go
app.OnRecordCreate("posts").BindFunc(func(e *core.RecordCreateEvent) error {
    if err := validatePost(e.Record); err != nil {
        return err
    }
    return e.Next()
})

func validatePost(record *core.Record) error {
    title := record.GetString("title")
    if len(title) == 0 {
        return errors.New("title is required")
    }
    if len(title) > 200 {
        return errors.New("title too long")
    }
    return nil
}
```

### 2. Logging

```go
app.OnRecordCreate("posts").BindFunc(func(e *core.RecordCreateEvent) error {
    e.App.Logger().Info("Post created",
        "id", e.Record.Id,
        "title", e.Record.GetString("title"),
    )
    return e.Next()
})
```

### 3. Security

```go
app.OnServe().BindFunc(func(se *core.ServeEvent) error {
    limiter := rate.NewLimiter(10, 20) // 10 req/sec, burst 20

    se.Router.BindFunc(func(e *core.RequestEvent) error {
        if !limiter.Allow() {
            return e.TooManyRequestsError("rate limit exceeded", nil)
        }
        return e.Next()
    })

    return se.Next()
})
```

### 4. Configuration

```go
type Config struct {
    ExternalAPIKey string
    EmailFrom      string
}

func (c Config) Name() string {
    return "myapp"
}

func main() {
    app := pocketbase.NewWithConfig(Config{
        ExternalAPIKey: os.Getenv("API_KEY"),
        EmailFrom:      "noreply@example.com",
    })

    // Use config in hooks
    app.OnRecordCreate("posts").BindFunc(func(e *core.RecordCreateEvent) error {
        cfg := e.App.Config().(*Config)
        // Use cfg.ExternalAPIKey
        return e.Next()
    })
}
```

## Common Patterns

### 1. Soft Delete

```go
app.OnRecordDelete("posts").BindFunc(func(e *core.RecordDeleteEvent) error {
    // Instead of deleting, mark as deleted
    e.Record.Set("status", "deleted")
    e.Record.Set("deleted_at", time.Now())
    if err := e.App.Save(e.Record); err != nil {
        return err
    }
    return e.Next()
})
```

### 2. Audit Trail

```go
app.OnRecordCreateRequest("").BindFunc(func(e *core.RecordRequestEvent) error {
    if e.Collection.Name == "posts" || e.Collection.Name == "comments" {
        if e.Auth != nil {
            e.Record.Set("created_by", e.Auth.Id)
        }

        if info, err := e.RequestInfo(); err == nil {
            e.Record.Set("created_ip", info.RealIP)
        }
    }
    return e.Next()
})

app.OnRecordUpdateRequest("").BindFunc(func(e *core.RecordRequestEvent) error {
    if e.Collection.Name == "posts" || e.Collection.Name == "comments" {
        if e.Auth != nil {
            e.Record.Set("updated_by", e.Auth.Id)
        }
        e.Record.Set("updated_at", time.Now())
    }
    return e.Next()
})
```

### 3. Data Synchronization

```go
app.OnRecordCreate("posts").BindFunc(func(e *core.RecordCreateEvent) error {
    // Sync with external service
    if err := syncToExternalAPI(e.Record); err != nil {
        e.App.Logger().Warn("sync failed", "error", err)
    }
    return e.Next()
})

func syncToExternalAPI(record *core.Record) error {
    // Implement external API sync
    return nil
}
```

## Related Topics

- [Event Hooks](go_event_hooks.md) - Detailed hook documentation
- [Database](go_database.md) - Database operations
- [Routing](go_routing.md) - Custom API endpoints
- [Migrations](go_migrations.md) - Database migrations
- [Testing](go_testing.md) - Testing strategies
- [Logging](go_logging.md) - Logging and monitoring
