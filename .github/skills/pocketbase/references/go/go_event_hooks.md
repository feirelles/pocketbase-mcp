# Event Hooks - Go Extensions

## Overview

Event hooks allow you to execute custom logic when specific events occur in PocketBase, such as record creation, updates, authentication, or API requests.

## Hook Types

### Record Hooks
- `OnRecordCreate()` - Before/after record creation
- `OnRecordUpdate()` - Before/after record updates
- `OnRecordDelete()` - Before/after record deletion
- `OnRecordList()` - Before/after listing records
- `OnRecordView()` - Before/after viewing a record

### Auth Hooks
- `OnRecordAuth()` - After authentication
- `OnRecordAuthWithPassword()` - Password authentication
- `OnRecordAuthWithOAuth2()` - OAuth2 authentication
- `OnRecordRequestPasswordReset()` - Password reset request
- `OnRecordConfirmPasswordReset()` - Password reset confirmation

### Serve Hooks
- `OnServe()` - Customize the HTTP server before it starts serving requests
- `OnTerminate()` - Handle graceful shutdown logic

## Examples

### Auto-populate Fields

```go
app.OnRecordCreateRequest("posts").BindFunc(func(e *core.RecordRequestEvent) error {
    if e.Auth != nil {
        e.Record.Set("author", e.Auth.Id)
    }

    title := e.Record.GetString("title")
    slug := strings.ToLower(strings.ReplaceAll(title, " ", "-"))
    e.Record.Set("slug", slug)

    return e.Next()
})
```

### Validation

```go
import "github.com/pocketbase/dbx"

app.OnRecordCreate("posts").BindFunc(func(e *core.RecordCreateEvent) error {
    title := e.Record.GetString("title")
    if len(title) < 5 {
        return errors.New("title must be at least 5 characters")
    }

    if _, err := e.App.FindFirstRecordByFilter(
        "posts",
        "title = {:title}",
        dbx.Params{"title": title},
    ); err == nil {
        return errors.New("title already exists")
    }

    return e.Next()
})
```

### Cascading Updates

```go
import "github.com/pocketbase/dbx"

app.OnRecordUpdate("posts").BindFunc(func(e *core.RecordUpdateEvent) error {
    oldStatus := e.RecordOriginal.GetString("status")
    newStatus := e.Record.GetString("status")

    if oldStatus != "published" && newStatus == "published" {
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

---

**Note:** This is a placeholder file. See [go_overview.md](go_overview.md) for detailed hook documentation.
