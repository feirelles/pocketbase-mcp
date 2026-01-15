# go_console_commands - Go Extensions

## Overview

PocketBase exposes Cobra-based console commands that you can extend from either Go extensions or JavaScript `pb_hooks`. Use them for background jobs, data migrations, administrative helpers, or build-time automation. Review [`go_overview.md`](go_overview.md) for extension setup and wiring custom commands into the root CLI.

---

## Data Migration Commands

Import/export workflows benefit from running inside PocketBase where you can wrap operations in transactions, reuse the ORM, and uphold access rules. At a minimum:

1. Register a command on `$app.RootCmd()` (Go) or `$app.rootCmd` (JS hooks).
2. Accept flags for batch size, dry-run execution, and optional upsert keys.
3. Wrap writes in `app.RunInTransaction(...)` when consistency matters.
4. Use `app.FindCollectionByNameOrId` and `core.NewRecord` (Go) or `new Record(collection)` (JS) to construct records.
5. Stream large payloads in chunks to keep memory stable and close files promptly.

### Go skeleton

```go
package migrations

import (
    "encoding/json"
    "os"

    "github.com/pocketbase/pocketbase"
    "github.com/pocketbase/pocketbase/core"
    "github.com/spf13/cobra"
)

func Register(app *pocketbase.PocketBase) {
    var batchSize int

    cmd := &cobra.Command{
        Use:   "data:import <collection> <file>",
        Short: "Import records from a JSON file",
        Args:  cobra.ExactArgs(2),
        RunE: func(cmd *cobra.Command, args []string) error {
            collectionName, filePath := args[0], args[1]
            payload, err := os.ReadFile(filePath)
            if err != nil {
                return err
            }
            var rows []map[string]any
            if err := json.Unmarshal(payload, &rows); err != nil {
                return err
            }

            return app.RunInTransaction(func(txApp core.App) error {
                collection, err := txApp.FindCollectionByNameOrId(collectionName)
                if err != nil {
                    return err
                }
                for idx, row := range rows {
                    record := core.NewRecord(collection)
                    record.Load(row)
                    if err := txApp.Save(record); err != nil {
                        return err
                    }
                    if batchSize > 0 && (idx+1)%batchSize == 0 {
                        cmd.Printf("Imported %d records\n", idx+1)
                    }
                }
                return nil
            })
        },
    }

    cmd.Flags().IntVar(&batchSize, "batch", 500, "Records per transaction chunk")
    app.RootCmd().AddCommand(cmd)
}
```

Adapt the skeleton with streaming readers, upsert logic, or batch logging as needed. For a JavaScript equivalent, see the example in [Data Migration Workflows](../core/data_migration.md#option-2-custom-cli-commands).

---

## Automation Notes

- Prefer purpose-built commands (`data:import`, `data:export`) to avoid confusion with the built-in `migrate` schema command.
- Add validation flags (e.g., `--dry-run`, `--allow-save-no-validate`) to make commands safer in production.
- Consider registering complementary commands for exporting manifests, truncating collections, or rehydrating relation fields.
- If you need to expose the same logic via HTTP, see [`go_routing.md`](go_routing.md) for admin-only endpoints that invoke the same import/export routines under the hood.
