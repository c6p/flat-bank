import os
import pandas as pd
import pyarrow as pa
# import pyarrow.csv as pv
from datetime import datetime

bank_close_times = {"akbank": "18:00", "enpara": "17:22", "garanti": "18:00", "hsbc": "18:00", "ing": "17:45", "isbank": "17:45",
                    "kuveytturk": "17:00",  "teb": "17:30", "yapikredi": "18:00", "ziraat": "18:00"}

# for bank in bank_close_times:
#    # Define file paths
#    out_dir = f'banks/{bank}'
#    input_file = f'{out_dir}/archive.csv'
#    if not os.path.exists(out_dir):
#        os.makedirs(out_dir, exist_ok=True)
#
#    # Read the input CSV file with PyArrow
#    table = pv.read_csv(input_file, convert_options=pv.ConvertOptions(
#        column_types={
#            # 'zaman': pa.timestamp('s'),
#            'alis': pa.decimal64(18, 9),
#            'satis': pa.decimal64(18, 9),
#            # 'kur': pa.string()
#        }
#    ))
#
#    # Convert PyArrow Table to Pandas DataFrame
#    df = table.to_pandas()
#
#    # Convert 'zaman' from epoch seconds to datetime
#    df['zaman'] = pd.to_datetime(
#        df['zaman'], unit='s', utc=True).dt.tz_convert('Europe/Istanbul')
#
#    # Split the data into today's data and previous data
#    today = pd.Timestamp.now(tz='Europe/Istanbul').normalize()
#    today_data = df[df['zaman'] >= today]
#    prev_data = df[df['zaman'] < today]
#
#    for kur, group in prev_data.groupby('kur'):
#        # Extract close prices (last values before 17:30 every day)
#        close_times = group[group['zaman'].dt.time <= datetime.strptime(
#            bank_close_times[bank], '%H:%M').time()]
#        close_prices = close_times.groupby(close_times['zaman'].dt.date).last(
#        ).reset_index(drop=True).drop(columns=['kur'])
#        if not close_prices.empty:
#            kur_dir = f'{out_dir}/{kur}'
#            if not os.path.exists(kur_dir):
#                os.makedirs(kur_dir, exist_ok=True)
#
#            close_file = f'{kur_dir}/close.arrow'
#
#            # Convert zaman to timestamp and alis, satis to Decimal64(18,9)
#            close_prices['zaman'] = close_prices['zaman'].dt.tz_convert('UTC')
#            table = pa.Table.from_pandas(close_prices, schema=pa.schema([
#                pa.field('zaman', pa.timestamp('s')),
#                pa.field('alis', pa.decimal64(18, 9)),
#                pa.field('satis', pa.decimal64(18, 9))
#            ]))
#
#            with pa.OSFile(close_file, 'wb') as sink:
#                with pa.RecordBatchFileWriter(sink, table.schema) as writer:
#                    writer.write_table(table)

for bank in bank_close_times:
    # Define file paths
    # input_file = f'{bank}.csv'
    out_dir = f'banks/{bank}'
    input_file = f'{out_dir}/archive.csv'
    # close_file = f'{out_dir}/close.csv'
    if not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    # Read the input CSV file
    pa_timestamp = pd.ArrowDtype(pa.timestamp('s'))
    pa_decimal = pd.ArrowDtype(pa.decimal64(18, 9))
    df = pd.read_csv(input_file, dtype={
                     # 'zaman': pa_timestamp,
                     'alis': pa_decimal,
                     'satis': pa_decimal,
                     # 'kur': 'string[pyarrow]'
                     })
    print(input_file, df.dtypes)
    # Convert 'alis' and 'satis' to Decimal
    # df['alis'] = df['alis'].apply(Decimal)
    # df['satis'] = df['satis'].apply(Decimal)

    # Convert 'zaman' from epoch seconds to datetime
    df['zaman'] = pd.to_datetime(
        df['zaman'], unit='s', utc=True).dt.tz_convert('Europe/Istanbul')

    # Split the data into today's data and previous data
    today = pd.Timestamp.now(tz='Europe/Istanbul').normalize()
    today_data = df[df['zaman'] >= today]
    prev_data = df[df['zaman'] < today]

    for kur, group in prev_data.groupby('kur'):
        # Extract close prices (last values before 17:30 every day)
        close_times = group[group['zaman'].dt.time <=
                            datetime.strptime(bank_close_times[bank], '%H:%M').time()]
        close_prices = close_times.groupby(
            close_times['zaman'].dt.date).last().reset_index(drop=True).drop(columns=['kur'])
        if not close_prices.empty:
            kur_dir = f'{out_dir}/{kur}'
            if not os.path.exists(kur_dir):
                os.makedirs(kur_dir, exist_ok=True)

            close_file = f'{kur_dir}/close.arrow'

            # Convert zaman to timestamp and alis, satis to Decimal64(18,9)
            close_prices['zaman'] = close_prices['zaman'].dt.tz_convert('UTC')
            table = pa.Table.from_pandas(close_prices, schema=pa.schema([
                pa.field('zaman', pa.timestamp('s')),
                pa.field('alis', pa.decimal64(18, 9)),
                pa.field('satis', pa.decimal64(18, 9))
            ]))

            with pa.OSFile(close_file, 'wb') as sink:
                with pa.RecordBatchFileWriter(sink, table.schema) as writer:
                    writer.write_table(table)

            # close_file = f'{kur_dir}/close.csv'
            # close_prices['zaman'] = close_prices['zaman'].dt.tz_convert(
            #    'UTC').astype(int) // 10**9
            # close_prices.to_csv(close_file, mode='a', header=not pd.io.common.file_exists(
            #    close_file), index=False)

# for kur, group in today_data.groupby('kur'):
#    kur_dir = f'{out_dir}/{kur}'
#    if not os.path.exists(kur_dir):
#        os.makedirs(kur_dir, exist_ok=True)
#    today_file = f'{kur_dir}/day.csv'
#    group['zaman'] = group['zaman'].dt.tz_convert(
#        'UTC').astype(int) // 10**9
#    group.drop(columns=['kur']).to_csv(today_file, mode='a', header=not pd.io.common.file_exists(
#        today_file), index=False)

# Convert 'zaman' back to UTC timestamp in seconds for saving
# prev_data['zaman'] = prev_data['zaman'].dt.tz_convert(
#    'UTC').astype(int) // 10**9
# today_data['zaman'] = today_data['zaman'].dt.tz_convert(
#    'UTC').astype(int) // 10**9

# Append previous data to archive.csv
# if not prev_data.empty:
#    prev_data.to_csv(archive_file, mode='a', header=not pd.io.common.file_exists(
#        archive_file), index=False)

# Append close prices to close.csv
# if not close_prices.empty:
#    close_prices['zaman'] = close_prices['zaman'].dt.tz_convert(
#        'UTC').astype(int) // 10**9
#    close_prices.to_csv(close_file, mode='a', header=not pd.io.common.file_exists(
#        close_file), index=False)

# Save today's data back to the input file
# today_data.to_csv(input_file, index=False)
