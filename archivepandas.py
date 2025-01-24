import os
import pandas as pd
from datetime import datetime

bank_close_times = {"akbank": "18:00", "enpara": "17:22", "garanti": "18:00", "hsbc": "18:00", "ing": "17:45", "isbank": "17:45",
                    "kuveytturk": "17:00",  "teb": "17:30", "yapikredi": "18:00", "ziraat": "18:00"}

for bank in bank_close_times:
    # Define file paths
    input_file = f'{bank}.csv'
    out_dir = f'banks/{bank}'
    archive_file = f'{out_dir}/archive.csv'
    close_file = f'{out_dir}/close.csv'
    if not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    # Read the input CSV file
    df = pd.read_csv(input_file)

    # Convert 'zaman' from epoch seconds to datetime
    df['zaman'] = pd.to_datetime(
        df['zaman'], unit='s', utc=True).dt.tz_convert('Europe/Istanbul')

    # Split the data into today's data and previous data
    today = pd.Timestamp.now(tz='Europe/Istanbul').normalize()
    today_data = df[df['zaman'] >= today]
    prev_data = df[df['zaman'] < today]

    # Extract close prices (last values before 17:30 every day)
    close_times = prev_data[prev_data['zaman'].dt.time <=
                            datetime.strptime(bank_close_times[bank], '%H:%M').time()]
    close_prices = close_times.groupby(
        close_times['zaman'].dt.date).last().reset_index(drop=True)

    # Convert 'zaman' back to UTC timestamp in seconds for saving
    prev_data['zaman'] = prev_data['zaman'].dt.tz_convert(
        'UTC').astype(int) // 10**9
    today_data['zaman'] = today_data['zaman'].dt.tz_convert(
        'UTC').astype(int) // 10**9

    # Append previous data to archive.csv
    if not prev_data.empty:
        prev_data.to_csv(archive_file, mode='a', header=not pd.io.common.file_exists(
            archive_file), index=False)

    # Append close prices to close.csv
    if not close_prices.empty:
        close_prices['zaman'] = close_prices['zaman'].dt.tz_convert(
            'UTC').astype(int) // 10**9
        close_prices.to_csv(close_file, mode='a', header=not pd.io.common.file_exists(
            close_file), index=False)

    # Save today's data back to the input file
    today_data.to_csv(input_file, index=False)
