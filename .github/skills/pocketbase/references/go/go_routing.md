# Routing - Go Extensions

## Overview

Create custom API endpoints and middleware using PocketBase's routing system.

## Custom Endpoints

```go
app.OnServe().BindFunc(func(se *core.ServeEvent) error {
    // GET endpoint
    se.Router.GET("/api/custom", func(e *core.RequestEvent) error {
        return e.JSON(200, map[string]string{"status": "ok"})
    })

    // POST endpoint
    se.Router.POST("/api/custom", func(e *core.RequestEvent) error {
        return e.JSON(200, map[string]string{"message": "created"})
    })

    return se.Next()
})
```

### Admin-only import/export endpoints

Expose migration jobs over HTTP when you need a web dashboard trigger:

```go
app.OnServe().BindFunc(func(se *core.ServeEvent) error {
    se.Router.POST("/api/admin/data/import", func(e *core.RequestEvent) error {
        if !apis.IsSuperUser(e.Auth) {
            return apis.NewForbiddenError("admin token required", nil)
        }

        var payload struct {
            Collection string `json:"collection"`
            File       string `json:"file"`
            DryRun     bool   `json:"dryRun"`
        }
        if err := e.BindBody(&payload); err != nil {
            return err
        }

        return e.App.RunInTransaction(func(txApp core.App) error {
            // invoke shared import logic here
            return nil
        })
    })

    return se.Next()
})
```

- Require superuser tokens (or tighter auth) before touching data.
- For long-running operations, enqueue a job and return an ID the client can poll.
- Keep HTTP handlers thin—delegate to the same helpers used by the CLI commands described in [Data Migration Workflows](../core/data_migration.md).

---

**Note:** See [go_overview.md](go_overview.md) for detailed routing documentation.
