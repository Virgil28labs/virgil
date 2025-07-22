
// Mock weather service
export const weatherService = {
  getWeatherByCoordinates: jest.fn(),
  getWeatherByCity: jest.fn(),
  convertTemperature: jest.fn((temp: number, toCelsius: boolean): number => {
    if (toCelsius) {
      return Math.round((temp - 32) * 5 / 9);
    } else {
      return Math.round(temp * 9 / 5 + 32);
    }
  }),
  getWeatherIconUrl: jest.fn((iconCode: string): string => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }),
  getWeatherEmoji: jest.fn((conditionId: number): string => {
    if (conditionId >= 200 && conditionId < 300) return '⛈️';
    if (conditionId >= 300 && conditionId < 400) return '🌦️';
    if (conditionId >= 500 && conditionId < 600) return '🌧️';
    if (conditionId >= 600 && conditionId < 700) return '❄️';
    if (conditionId >= 700 && conditionId < 800) return '🌫️';
    if (conditionId === 800) return '☀️';
    if (conditionId === 801) return '🌤️';
    if (conditionId === 802) return '⛅';
    if (conditionId === 803 || conditionId === 804) return '☁️';
    return '🌡️';
  }),
  clearCache: jest.fn(),
};