import abc
import filters.fileutils as file_utils
import pandas as pd


class CryptoTweetFilter(abc.ABC):
    @abc.abstractmethod
    def load_df(input_csv_filepath):
        pass

    def filter(keyword):
        pass

    def print(self):
        pass

    def write_to_csv(output_csv_filepath):
        pass


# Filters tweets from vicinitas.io csv dumps
class VicinitasTweetFilter(CryptoTweetFilter):

    OUTPUT_COLUMN_LABELS = ["UTC", "Text", "Screen Name"]

    def __init__(self, csv_fp):
        self.load_df(csv_fp)

    def load_df(self, input_csv_filepath):
        try:
            self.input_csv_filepath = input_csv_filepath
            self.input_df = pd.read_csv(input_csv_filepath)
        except FileNotFoundError:
            print('File {0} not found.'.format(input_csv_filepath))
        except pd.errors.EmptyDataError:
            print("No data in file {0}".format(input_csv_filepath))
        except pd.errors.ParserError:
            print("Parse error in file {0}".format(input_csv_filepath))
        except Exception:
            print("Some other exception")
        self.filtered_df = self.input_df[self.OUTPUT_COLUMN_LABELS]

    def filter(self, keyword):
        self.keyword = keyword
        self.filtered_df = self.input_df[self.input_df['Text'].str.contains(
            self.keyword)]
        self.filtered_df = self.filtered_df[self.OUTPUT_COLUMN_LABELS]

    def print(self):
        print(self.filtered_df)

    def write_to_csv(self, output_dir):
        output_fp = file_utils.create_filtered_filepath(
            self.keyword, self.input_csv_filepath, output_dir)
        self.filtered_df.to_csv(output_fp)
