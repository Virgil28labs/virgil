/**
 * IPHoverCard Component
 * 
 * Displays detailed IP information in a hover card with Virgil's design aesthetic.
 * Shows location, ISP, connection type, and privacy indicators.
 */

import { memo, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { IpLocation } from '../../types/location.types';

interface IPHoverCardProps {
  ipLocation: IpLocation;
  isVisible: boolean;
  className?: string;
}

// Helper to detect IPv6
const isIPv6 = (ip: string): boolean => {
  return ip.includes(':');
};

const IPHoverCard = memo(function IPHoverCard({
  ipLocation,
  isVisible,
  className = '',
}: IPHoverCardProps) {
  if (!isVisible || !ipLocation) return null;

  // Check if we have limited data (e.g., reserved IP range)
  const hasLimitedData = !ipLocation.city && !ipLocation.country;
  const ipVersion = isIPv6(ipLocation.ip) ? 'IPv6' : 'IPv4';

  // Format local time if available
  const formatLocalTime = () => {
    if (!ipLocation.timezone_details?.current_time) {
      return null;
    }
    
    try {
      const date = new Date(ipLocation.timezone_details.current_time);
      const hours = date.getHours();
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      
      // Add day/night emoji
      const timeEmoji = hours >= 6 && hours < 18 ? '☀️' : '🌙';
      return `${timeEmoji} ${timeStr}`;
    } catch {
      return null;
    }
  };

  // Determine connection type display
  const getConnectionType = () => {
    const type = ipLocation.type?.toLowerCase();
    const isp = ipLocation.isp?.toLowerCase() || '';
    const org = ipLocation.org?.toLowerCase() || '';
    
    // Check for VPN/proxy indicators
    if (type === 'vpn' || type === 'proxy' || 
        isp.includes('vpn') || org.includes('vpn') ||
        isp.includes('proxy') || org.includes('proxy') ||
        type === 'hosting' || type === 'datacenter') {
      return { text: 'VPN/Proxy Detected', icon: '🔒', isPrivate: true };
    }
    
    if (type === 'business' || type === 'corporate') {
      return { text: 'Business', icon: '🏢', isPrivate: false };
    }
    
    return { text: 'Residential', icon: '🏠', isPrivate: false };
  };

  const connectionType = getConnectionType();
  const localTime = formatLocalTime();

  // Show minimal card for limited data
  if (hasLimitedData) {
    return (
      <div 
        className={`ip-hover-card ip-hover-card-minimal ${className}`}
        role="tooltip"
        aria-label="IP address details"
      >
        <div className="ip-minimal-content">
          <div className="ip-address-display">
            <span className="ip-version-badge">{ipVersion}</span>
            <span className="ip-address-text">{ipLocation.ip}</span>
          </div>
          <div className="ip-status-message">
            {ipLocation.type === 'IPv6' ? 'IPv6 Address' : 'Private or Reserved IP Range'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`ip-hover-card ${className}`}
      role="tooltip"
      aria-label="IP address details"
    >
      {/* IP Address with version badge */}
      <div className="ip-address-header">
        <div className="ip-address-display">
          <span className="ip-version-badge">{ipVersion}</span>
          <span className="ip-address-text">{ipLocation.ip}</span>
        </div>
      </div>

      {/* Compact location info */}
      <div className="ip-header">
        <div className="ip-location-line">
          {ipLocation.flag && <span className="ip-flag">{ipLocation.flag}</span>}
          <span className="ip-location-text">
            {ipLocation.city}{ipLocation.region ? `, ${ipLocation.region}` : ''}
          </span>
        </div>
      </div>

      {/* ISP and connection info */}
      <div className="ip-info-group">
        <div className="ip-isp-line">
          {ipLocation.isp || ipLocation.org || 'Unknown Provider'}
        </div>
        <div className="ip-connection-line">
          <span className={connectionType.isPrivate ? 'ip-vpn-indicator' : 'ip-connection-type'}>
            {connectionType.text}
          </span>
          {ipLocation.connection?.asn && (
            <span className="ip-asn">AS{ipLocation.connection.asn}</span>
          )}
        </div>
      </div>

      {/* Compact details */}
      <div className="ip-details-group">
        {localTime && (
          <div className="ip-time-line">
            {localTime} • {ipLocation.lat?.toFixed(4)}°, {ipLocation.lon?.toFixed(4)}°
          </div>
        )}
        {ipLocation.postal && (
          <div className="ip-postal">{ipLocation.postal}</div>
        )}
      </div>
    </div>
  );
});

/**
 * Positioned wrapper for the hover card
 * Handles smart positioning relative to the trigger element
 */
interface PositionedIPHoverCardProps extends IPHoverCardProps {
  triggerRef?: React.RefObject<HTMLDivElement | null>;
}

export const PositionedIPHoverCard = memo(function PositionedIPHoverCard({
  triggerRef,
  ...cardProps
}: PositionedIPHoverCardProps) {
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'top' as 'top' | 'bottom' });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!triggerRef?.current || !cardProps.isVisible) return;

    const calculatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      
      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Card dimensions (estimated)
      const cardHeight = 200;
      const cardWidth = 320;
      const offset = 12; // Space between trigger and card
      
      // Determine vertical placement - prefer bottom for better UX
      const spaceBelow = viewportHeight - rect.bottom;
      const placement = spaceBelow > cardHeight + offset ? 'bottom' : 'top';
      
      // Calculate position
      const top = placement === 'top' 
        ? rect.top - cardHeight - offset 
        : rect.bottom + offset;
      
      let left = rect.left + rect.width / 2;
      
      // Adjust horizontal position to stay within viewport
      if (left - cardWidth / 2 < 10) {
        left = cardWidth / 2 + 10;
      } else if (left + cardWidth / 2 > viewportWidth - 10) {
        left = viewportWidth - cardWidth / 2 - 10;
      }
      
      setPosition({ top, left, placement });
    };

    calculatePosition();
    
    // Recalculate on window resize
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, [triggerRef, cardProps.isVisible]);

  if (!cardProps.isVisible) return null;

  return createPortal(
    <div 
      ref={cardRef}
      className={`ip-hover-card-wrapper ${position.placement}`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
        opacity: cardProps.isVisible ? 1 : 0,
        visibility: cardProps.isVisible ? 'visible' : 'hidden',
      }}
    >
      <IPHoverCard {...cardProps} />
      <div className="ip-hover-arrow" />
    </div>,
    document.body,
  );
});

export default IPHoverCard;