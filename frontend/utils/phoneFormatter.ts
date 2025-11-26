/**
 * Removes formatting from a phone number string
 * @param phone - The formatted phone number string
 * @returns Phone number with only digits and + sign
 */
export function unformatPhoneNumber(phone: string): string {
  // Keep only digits and +
  return phone.replace(/[^\d+]/g, '');
}

// Helper function to parse phone number and extract country code
export const parsePhoneNumber = (phoneNumber: string): { countryCode: string; number: string } => {
    if (!phoneNumber || !phoneNumber.startsWith('+')) {
      return { countryCode: 'US', number: phoneNumber || '' };
    }

    // Remove the + sign
    const digits = phoneNumber.substring(1);
    
    // Try to detect country code (1-3 digits)
    // Common patterns: +1 (US/Canada), +44 (UK), +33 (France), etc.
    let countryCode = 'US';
    let number = digits;

    // Map of country codes to ISO country codes
    // Check longer codes first to avoid ambiguity
    const countryMap: { [key: string]: string } = {
      // 3-digit codes (check these first)
      '358': 'FI', // Finland
      '381': 'RS', // Serbia
      '385': 'HR', // Croatia
      '386': 'SI', // Slovenia
      '387': 'BA', // Bosnia
      '389': 'MK', // Macedonia
      '382': 'ME', // Montenegro
      '383': 'XK', // Kosovo
      '351': 'PT', // Portugal
      '352': 'LU', // Luxembourg
      '353': 'IE', // Ireland
      '354': 'IS', // Iceland
      '356': 'MT', // Malta
      '357': 'CY', // Cyprus
      '359': 'BG', // Bulgaria
      '380': 'UA', // Ukraine
      '375': 'BY', // Belarus
      '370': 'LT', // Lithuania
      '371': 'LV', // Latvia
      '372': 'EE', // Estonia
      '420': 'CZ', // Czech Republic
      '421': 'SK', // Slovakia
      // 2-digit codes
      '44': 'GB', // UK
      '33': 'FR', // France
      '49': 'DE', // Germany
      '39': 'IT', // Italy
      '34': 'ES', // Spain
      '31': 'NL', // Netherlands
      '32': 'BE', // Belgium
      '41': 'CH', // Switzerland
      '43': 'AT', // Austria
      '45': 'DK', // Denmark
      '46': 'SE', // Sweden
      '47': 'NO', // Norway
      '30': 'GR', // Greece
      '48': 'PL', // Poland
      '36': 'HU', // Hungary
      '40': 'RO', // Romania
      // 1-digit codes
      '1': 'US', // US/Canada
      '7': 'RU', // Russia/Kazakhstan
    };

    // Check 3-digit codes first
    if (digits.length >= 3) {
      const threeDigit = digits.substring(0, 3);
      if (countryMap[threeDigit]) {
        countryCode = countryMap[threeDigit];
        number = digits.substring(3);
        return { countryCode, number };
      }
    }
    
    // Check 2-digit codes
    if (digits.length >= 2) {
      const twoDigit = digits.substring(0, 2);
      if (countryMap[twoDigit]) {
        countryCode = countryMap[twoDigit];
        number = digits.substring(2);
        return { countryCode, number };
      }
    }
    
    // Check 1-digit codes
    if (digits.length >= 1) {
      const oneDigit = digits.substring(0, 1);
      if (countryMap[oneDigit]) {
        countryCode = countryMap[oneDigit];
        number = digits.substring(1);
        return { countryCode, number };
      }
    }

    return { countryCode, number };
};

