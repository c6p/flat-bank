# Flat Bank Data Fetcher

This repository automatically fetches exchange rate data from Turkish banks and stores it in CSV format.

## Architecture

### Workflow Structure

The data fetching workflow has been optimized for cost-effectiveness and reliability:

- **Schedule**: Runs every 10 minutes (`*/10 * * * *`)
- **Parallel Execution**: Fetches from multiple banks simultaneously using GitHub Actions matrix strategy
- **Failure Handling**: Individual bank failures don't stop other banks from being fetched
- **Concurrency Control**: Limits parallel jobs to 5 and cancels redundant runs
- **Automatic Issue Creation**: Creates GitHub issues for failures with duplicate detection
- **Issue Auto-Close**: Automatically closes issues when banks recover

### Banks Supported

- Akbank
- ING
- Garanti BBVA
- Enpara (QNB Finansbank)
- TEB
- HSBC
- Kuveyt Türk
- İşbank
- Ziraat Bankası
- Yapı Kredi

## File Structure

- `.github/workflows/flat.yml` - Main workflow file with matrix strategy
- `scripts/fetch-bank.ts` - Unified TypeScript fetcher for all banks
- `{bank}.csv` - CSV output files (one per bank)
- `logs/failures.jsonl` - Structured error logs (if failures occur)

## Usage

### Manual Trigger

You can manually trigger the workflow to fetch specific banks:

1. Go to Actions → data workflow
2. Click "Run workflow"
3. Optionally specify comma-separated bank names (e.g., `akbank,ing`)
4. Leave empty to fetch all banks

### Data Format

Each CSV file contains:
```
timestamp,currency_code,buy_rate,sell_rate
```

Where:
- `timestamp` - Unix timestamp in seconds
- `currency_code` - Currency code (USD, EUR, XAU, etc.)
- `buy_rate` - Bank's buy rate
- `sell_rate` - Bank's sell rate

## Development

### Running Locally

```bash
# Fetch data for a specific bank
deno run --allow-all scripts/fetch-bank.ts akbank

# Available banks
deno run --allow-read scripts/fetch-bank.ts
```

### Requirements

- Deno v1.x
- Permissions: `--allow-all` (network, read, write)

### Error Handling

Errors are logged to `logs/failures.jsonl` with the following structure:
```json
{
  "timestamp": "2024-01-07T12:00:00.000Z",
  "bank": "akbank",
  "error": "Error message",
  "stack": "Stack trace"
}
```

## Monitoring

- Check the Actions tab for workflow runs
- Review the job summary for success/failure counts
- Issues are automatically created for failures
- Failure logs are uploaded as artifacts (7-day retention)

## Archive

The `archive.py` script processes daily data for archival purposes. It runs separately and archives previous day's data to the `banks/` directory.
