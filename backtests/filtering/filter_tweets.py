import config.config as config
import filters.tweet as filter

# Filter tweet csv's and save to file


def main():
    for csv_filepath in config.filter_config.csv_filepaths:
        for coin_keyword in config.filter_config.coin_keywords:
            print("Filtering occurences of " +
                  coin_keyword + " in " + csv_filepath)

            tweetFilter = filter.VicinitasTweetFilter(csv_filepath)
            # tweetFilter.print()
            tweetFilter.filter(coin_keyword)
            tweetFilter.print()
            # tweetFilter.write_to_csv(config.filter_config.output_dir)


if __name__ == "__main__":
    main()
