import { render, screen, fireEvent } from '@testing-library/react';
import { GoogleMapsModal } from './GoogleMapsModal';
import * as googleMapsUtils from '../../utils/googleMaps';

// Mock the Google Maps utilities
jest.mock('../../utils/googleMaps');

describe('GoogleMapsModal', () => {
  const mockCoordinates = {
    latitude: 37.7749,
    longitude: -122.4194,
  };

  const mockAddress = {
    street: '123 Market Street',
    city: 'San Francisco',
    formatted: '123 Market Street, San Francisco, CA',
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the API key getter
    jest.spyOn(googleMapsUtils, 'getGoogleMapsApiKey').mockReturnValue('test-api-key');
    // Mock the load function
    jest.spyOn(googleMapsUtils, 'loadGoogleMaps').mockResolvedValue({} as any);
    // Mock Street View availability check
    jest.spyOn(googleMapsUtils, 'checkStreetViewAvailability').mockResolvedValue(true);
  });

  it('should not render when isOpen is false', () => {
    render(
      <GoogleMapsModal
        isOpen={false}
        onClose={mockOnClose}
        coordinates={mockCoordinates}
        address={mockAddress}
      />,
    );

    expect(screen.queryByText('123 Market Street')).not.toBeInTheDocument();
  });

  it('should render modal with address when isOpen is true', () => {
    render(
      <GoogleMapsModal
        isOpen
        onClose={mockOnClose}
        coordinates={mockCoordinates}
        address={mockAddress}
      />,
    );

    expect(screen.getByText('123 Market Street')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    render(
      <GoogleMapsModal
        isOpen
        onClose={mockOnClose}
        coordinates={mockCoordinates}
        address={mockAddress}
      />,
    );

    expect(screen.getByText('Loading maps...')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <GoogleMapsModal
        isOpen
        onClose={mockOnClose}
        coordinates={mockCoordinates}
        address={mockAddress}
      />,
    );

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should handle missing address gracefully', () => {
    render(
      <GoogleMapsModal
        isOpen
        onClose={mockOnClose}
        coordinates={mockCoordinates}
        address={null}
      />,
    );

    expect(screen.getByText('Current Location')).toBeInTheDocument();
  });

  it('should handle missing coordinates gracefully', () => {
    render(
      <GoogleMapsModal
        isOpen
        onClose={mockOnClose}
        coordinates={null}
        address={mockAddress}
      />,
    );

    // Modal should still render but maps won't initialize
    expect(screen.getByText('123 Market Street')).toBeInTheDocument();
  });

  it('should show error message when API key is missing', async () => {
    jest.spyOn(googleMapsUtils, 'getGoogleMapsApiKey').mockReturnValue(null);

    render(
      <GoogleMapsModal
        isOpen
        onClose={mockOnClose}
        coordinates={mockCoordinates}
        address={mockAddress}
      />,
    );

    // Wait for the error to appear
    expect(await screen.findByText(/Google Maps API key not found/i)).toBeInTheDocument();
  });
});