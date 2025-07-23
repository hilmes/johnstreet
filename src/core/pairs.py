# /src/core/pairs.py

import logging
from typing import List

# Adjust this import to match the actual location/naming of your EnhancedKrakenAPI file
from src.api.enhanced_kraken import EnhancedKrakenAPI


class KrakenPairs:
    """
    A simple wrapper around EnhancedKrakenAPI to provide a get_tradable_pairs() method
    that returns a list of pair strings. This can be used directly by your PairScreen
    or PairSelectionWidget code.
    """

    def __init__(self, api_key: str = "", api_secret: str = "", test_mode: bool = False):
        """
        Initialize an EnhancedKrakenAPI and store it here.
        """
        self.api = EnhancedKrakenAPI(api_key, api_secret, test_mode=test_mode)

    def get_tradable_pairs(self) -> List[str]:
        """
        Returns the list of tradable pairs from Kraken. In case of error,
        logs it and returns an empty list.
        """
        try:
            # EnhancedKrakenAPI.get_tradable_pairs() returns a list of pair IDs
            # e.g. ['XXBTZUSD', 'XETHZUSD', 'ADAUSD', etc.]
            pairs = self.api.get_tradable_pairs()
            return pairs
        except Exception as e:
            logging.error(f"Error fetching pairs from Kraken: {e}", exc_info=True)
            return []


def get_kraken_pairs(api_key: str = "", api_secret: str = "", test_mode: bool = False) -> List[str]:
    """
    A convenient helper function if you just need a quick list of pairs,
    without manually instantiating anything.

    Example usage:
        pairs = get_kraken_pairs(api_key="xxx", api_secret="yyy", test_mode=True)
    """
    kraken_pairs = KrakenPairs(api_key, api_secret, test_mode=test_mode)
    return kraken_pairs.get_tradable_pairs()
