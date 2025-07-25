/**
 * UserProfileAdapter - Dashboard App Adapter for User Profile Data
 * 
 * Integrates user profile information with DashboardAppService,
 * making all profile fields searchable and queryable by Virgil.
 */

import type { AppDataAdapter, AppContextData } from '../DashboardAppService';
import type { UserProfile } from '../../hooks/useUserProfile';
import type { AuthContextValue } from '../../types/auth.types';
import { timeService } from '../TimeService';

export class UserProfileAdapter implements AppDataAdapter<UserProfile> {
  readonly appName = 'userProfile';
  readonly displayName = 'User Profile';
  readonly icon = '👤';
  
  private profile: UserProfile | null = null;
  private authData: AuthContextValue | null = null;
  private subscribers: ((data: UserProfile) => void)[] = [];

  /**
   * Update profile data
   */
  updateProfile(profile: UserProfile, authData: AuthContextValue): void {
    this.profile = profile;
    this.authData = authData;
    this.notifySubscribers();
  }

  /**
   * Get context data for Virgil
   */
  getContextData(): AppContextData<UserProfile> {
    return {
      appName: this.appName,
      displayName: this.displayName,
      isActive: true, // Always active when user is logged in
      lastUsed: timeService.getTimestamp(),
      data: this.profile || this.getEmptyProfile(),
      summary: this.generateSummary(),
      capabilities: [
        'personal information',
        'address lookup',
        'profile details',
        'contact information',
        'birthday information',
      ],
      icon: this.icon,
    };
  }

  /**
   * Subscribe to profile updates
   */
  subscribe(callback: (data: UserProfile) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  /**
   * Check if adapter can answer a query
   */
  canAnswer(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return this.getKeywords().some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Get searchable keywords
   */
  getKeywords(): string[] {
    return [
      // Identity keywords
      'my name', 'what\'s my name', 'who am i', 'my identity',
      'nickname', 'full name', 'username', 'unique id',
      
      // Contact keywords
      'my email', 'email address', 'my phone', 'phone number',
      'contact', 'contact info', 'contact information',
      
      // Address keywords
      'my address', 'where do i live', 'home address', 'location',
      'street', 'city', 'state', 'zip', 'postal', 'country',
      
      // Personal info keywords
      'my birthday', 'date of birth', 'when was i born', 'my age',
      'gender', 'marital status', 'personal info', 'profile',
      
      // General profile keywords
      'my info', 'my information', 'my details', 'my data',
      'about me', 'my profile', 'user profile', 'account info',
    ];
  }

  /**
   * Generate response for a query
   */
  async getResponse(query: string): Promise<string> {
    if (!this.profile) {
      return "I don't have access to your profile information yet. Please make sure you're logged in and have filled out your profile.";
    }

    const lowerQuery = query.toLowerCase();

    // Name queries
    if (lowerQuery.includes('name') || lowerQuery.includes('who am i')) {
      if (this.profile.fullName) {
        let response = `Your full name is ${this.profile.fullName}`;
        if (this.profile.nickname && this.profile.nickname !== this.profile.fullName) {
          response += `, but you go by ${this.profile.nickname}`;
        }
        if (this.profile.uniqueId) {
          response += `. Your unique ID is ${this.profile.uniqueId}`;
        }
        return response + '.';
      } else if (this.profile.nickname) {
        return `You go by ${this.profile.nickname}.`;
      }
      return "You haven't set your name in your profile yet.";
    }

    // Email queries
    if (lowerQuery.includes('email')) {
      if (this.profile.email) {
        return `Your email address is ${this.profile.email}.`;
      }
      return "You haven't set an email address in your profile.";
    }

    // Phone queries
    if (lowerQuery.includes('phone')) {
      if (this.profile.phone) {
        return `Your phone number is ${this.profile.phone}.`;
      }
      return "You haven't added a phone number to your profile.";
    }

    // Address queries
    if (lowerQuery.includes('address') || lowerQuery.includes('where do i live')) {
      if (this.hasCompleteAddress()) {
        const addr = this.profile.address;
        return `Your address is ${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}, ${addr.country}.`;
      } else if (this.profile.address.city) {
        return `You live in ${this.profile.address.city}${this.profile.address.state ? `, ${this.profile.address.state}` : ''}.`;
      }
      return "You haven't added your address to your profile.";
    }

    // Birthday/age queries
    if (lowerQuery.includes('birthday') || lowerQuery.includes('birth') || lowerQuery.includes('age')) {
      if (this.profile.dateOfBirth) {
        const birthDate = timeService.parseDate(this.profile.dateOfBirth) || timeService.getCurrentDateTime();
        const age = this.calculateAge(birthDate);
        const formattedDate = timeService.formatDateToLocal(birthDate, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        return `Your birthday is ${formattedDate}. You are ${age} years old.`;
      }
      return "You haven't added your date of birth to your profile.";
    }

    // Gender queries
    if (lowerQuery.includes('gender')) {
      if (this.profile.gender) {
        return `Your gender is listed as ${this.profile.gender}.`;
      }
      return "You haven't specified your gender in your profile.";
    }

    // Marital status queries
    if (lowerQuery.includes('marital') || lowerQuery.includes('married')) {
      if (this.profile.maritalStatus) {
        return `Your marital status is ${this.profile.maritalStatus}.`;
      }
      return "You haven't specified your marital status.";
    }

    // General profile summary
    if (lowerQuery.includes('my info') || lowerQuery.includes('my profile') || lowerQuery.includes('about me')) {
      return this.getProfileSummary();
    }

    // Contact info summary
    if (lowerQuery.includes('contact')) {
      return this.getContactSummary();
    }

    return 'I can help you with your profile information. You can ask about your name, email, phone, address, birthday, or other profile details.';
  }

  /**
   * Search within profile data
   */
  async search(query: string): Promise<Array<{
    type: string;
    label: string;
    value: string;
    field: string;
  }>> {
    if (!this.profile) return [];

    const lowerQuery = query.toLowerCase();
    const results: Array<{
      type: string;
      label: string;
      value: string;
      field: string;
    }> = [];

    // Search through all profile fields
    const searchableFields = [
      { field: 'fullName', label: 'Full Name' },
      { field: 'nickname', label: 'Nickname' },
      { field: 'email', label: 'Email' },
      { field: 'phone', label: 'Phone' },
      { field: 'uniqueId', label: 'Unique ID' },
    ] as const;

    for (const { field, label } of searchableFields) {
      const value = this.profile[field];
      if (value && value.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'profile_field',
          label,
          value,
          field,
        });
      }
    }

    // Search address fields
    if (this.profile.address) {
      const addressFields = Object.entries(this.profile.address);
      for (const [field, value] of addressFields) {
        if (value && value.toLowerCase().includes(lowerQuery)) {
          results.push({
            type: 'address_field',
            label: `Address ${field}`,
            value,
            field: `address.${field}`,
          });
        }
      }
    }

    return results;
  }

  // Private helper methods

  private generateSummary(): string {
    if (!this.profile) return 'No profile data available';
    
    const parts: string[] = [];
    
    if (this.profile.fullName || this.profile.nickname) {
      parts.push(`User: ${this.profile.nickname || this.profile.fullName}`);
    }
    
    if (this.profile.email) {
      parts.push(`Email: ${this.profile.email}`);
    }
    
    if (this.hasCompleteAddress()) {
      parts.push(`Location: ${this.profile.address.city}, ${this.profile.address.state}`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Profile incomplete';
  }

  private getProfileSummary(): string {
    if (!this.profile) return 'No profile information available.';
    
    const sections: string[] = [];
    
    // Name section
    if (this.profile.fullName || this.profile.nickname) {
      let nameInfo = `**Name**: ${this.profile.fullName || this.profile.nickname}`;
      if (this.profile.nickname && this.profile.fullName && this.profile.nickname !== this.profile.fullName) {
        nameInfo += ` (goes by ${this.profile.nickname})`;
      }
      if (this.profile.uniqueId) {
        nameInfo += ` - ID: ${this.profile.uniqueId}`;
      }
      sections.push(nameInfo);
    }
    
    // Personal info
    const personalInfo: string[] = [];
    if (this.profile.dateOfBirth) {
      const age = this.calculateAge(timeService.parseDate(this.profile.dateOfBirth) || timeService.getCurrentDateTime());
      personalInfo.push(`${age} years old`);
    }
    if (this.profile.gender) {
      personalInfo.push(this.profile.gender);
    }
    if (this.profile.maritalStatus) {
      personalInfo.push(this.profile.maritalStatus);
    }
    if (personalInfo.length > 0) {
      sections.push(`**Personal**: ${personalInfo.join(', ')}`);
    }
    
    // Contact info
    if (this.profile.email || this.profile.phone) {
      const contactInfo: string[] = [];
      if (this.profile.email) contactInfo.push(this.profile.email);
      if (this.profile.phone) contactInfo.push(this.profile.phone);
      sections.push(`**Contact**: ${contactInfo.join(', ')}`);
    }
    
    // Address
    if (this.hasCompleteAddress()) {
      const addr = this.profile.address;
      sections.push(`**Address**: ${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`);
    }
    
    return sections.length > 0 
      ? `Here's your profile information:\n\n${sections.join('\n')}`
      : 'Your profile is incomplete. Consider adding more information.';
  }

  private getContactSummary(): string {
    const contact: string[] = [];
    
    if (this.profile?.email) {
      contact.push(`Email: ${this.profile.email}`);
    }
    
    if (this.profile?.phone) {
      contact.push(`Phone: ${this.profile.phone}`);
    }
    
    if (this.hasCompleteAddress() && this.profile?.address) {
      const addr = this.profile.address;
      contact.push(`Address: ${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`);
    }
    
    return contact.length > 0
      ? `Your contact information:\n${contact.join('\n')}`
      : "You haven't added any contact information to your profile yet.";
  }

  private hasCompleteAddress(): boolean {
    if (!this.profile?.address) return false;
    const addr = this.profile.address;
    return !!(addr.street && addr.city && addr.state && addr.zip);
  }

  private calculateAge(birthDate: Date): number {
    const today = timeService.getCurrentDateTime();
    let age = timeService.getYear(today) - timeService.getYear(birthDate);
    const monthDiff = timeService.getMonth(today) - timeService.getMonth(birthDate);
    
    if (monthDiff < 0 || (monthDiff === 0 && timeService.getDay(today) < timeService.getDay(birthDate))) {
      age--;
    }
    
    return age;
  }

  private getEmptyProfile(): UserProfile {
    return {
      nickname: '',
      fullName: '',
      dateOfBirth: '',
      email: this.authData?.user?.email || '',
      phone: '',
      gender: '',
      maritalStatus: '',
      uniqueId: '',
      address: {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: '',
      },
    };
  }

  private notifySubscribers(): void {
    if (this.profile) {
      this.subscribers.forEach(callback => callback(this.profile!));
    }
  }
}

// Singleton instance
export const userProfileAdapter = new UserProfileAdapter();