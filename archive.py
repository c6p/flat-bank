import os
import polars as pl
from datetime import datetime


def write_or_append_csv(file, df):
    exists = os.path.exists(file)
    with open(file, mode="a" + ('' if exists else '+'), encoding='utf-8') as f:
        df.write_csv(f, include_header=not exists)


bank_close_times = {
    "akbank": "18:00", "enpara": "17:22", "garanti": "18:00", "hsbc": "18:00",
    "ing": "17:45", "isbank": "17:45", "kuveytturk": "17:00", "teb": "17:30",
    "yapikredi": "18:00", "ziraat": "18:00"
}

for bank in bank_close_times:
    # Define file paths
    out_dir = f'banks/{bank}'
    # input_file = f'{out_dir}/archive.csv'
    input_file = f'{bank}.csv'
    if not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    # Read the input CSV file with Polars
    df = pl.read_csv(input_file, dtypes={
        'zaman': pl.Int64,
        # for arrow
        # 'alis': pl.Decimal(18, 9),
        # 'satis': pl.Decimal(18, 9),
    })

    # Convert 'zaman' from epoch seconds to datetime
    df = df.with_columns(
        (pl.col('zaman') * 1000).cast(pl.Datetime('ms')
                                      ).dt.convert_time_zone('Europe/Istanbul')
    )

    # Split the data into today's data and previous data
    today = pl.lit(datetime.now()).dt.convert_time_zone(
        'Europe/Istanbul').dt.truncate('1d')
    print(today)
    today_data = df.filter(pl.col('zaman') >= today)
    prev_data = df.filter(pl.col('zaman') < today)

    for kur, group in prev_data.group_by('kur'):
        # Extract close prices (last values before 17:30 every day)
        close_times = group.filter(
            pl.col('zaman').dt.time() <= datetime.strptime(
                bank_close_times[bank], '%H:%M').time()
        )
        close_prices = close_times.group_by(
            close_times['zaman'].dt.date(), maintain_order=True).last().drop('kur')
        print(close_times['zaman'].dt.date(),
              close_times.tail(), close_prices.tail())

        if not close_prices.is_empty():
            kur_dir = f'{out_dir}/{kur[0]}'
            if not os.path.exists(kur_dir):
                os.makedirs(kur_dir, exist_ok=True)

            # Write the DataFrame
            # close_prices.write_ipc_stream(close_file) # arrow
            write_or_append_csv(f'{kur_dir}/close.csv', close_prices)

    # Convert 'zaman' back to UTC timestamp in seconds for saving
    prev_data = prev_data.with_columns(
        pl.col('zaman').dt.convert_time_zone('UTC').cast(pl.Int64) // 1000
    )
    today_data = today_data.with_columns(
        pl.col('zaman').dt.convert_time_zone('UTC').cast(pl.Int64) // 1000
    )

    # Append previous data to archive.csv
    write_or_append_csv(f'{out_dir}/archive.csv', prev_data)

    # Save today's data back to the input file
    today_data.write_csv(input_file)
