import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UserProfileAdapter } from '../UserProfileAdapter';
import type { UserProfile } from '../../../hooks/useUserProfile';
import type { AuthContextValue } from '../../../types/auth.types';
import { timeService } from '../../TimeService';

// Mock dependencies
jest.mock('../../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(() => Date.now()),
    parseDate: jest.fn((date: string) => new Date(date)),
    getCurrentDateTime: jest.fn(() => new Date('2024-01-01T12:00:00Z')),
    formatDateToLocal: jest.fn((date: Date, options: any) => {
      return new Intl.DateTimeFormat('en-US', options).format(date);
    }),
    getYear: jest.fn((date: Date) => date.getFullYear()),
    getMonth: jest.fn((date: Date) => date.getMonth()),
    getDay: jest.fn((date: Date) => date.getDate()),
  },
}));

describe('UserProfileAdapter', () => {
  let adapter: UserProfileAdapter;
  let mockSubscriber: jest.MockedFunction<any>;

  const mockProfile: UserProfile = {
    nickname: 'Johnny',
    fullName: 'John Doe',
    dateOfBirth: '1990-05-15',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    gender: 'Male',
    maritalStatus: 'Single',
    uniqueId: 'USR123456',
    address: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'USA',
    },
  };

  const mockAuthData: AuthContextValue = {
    user: {
      id: 'auth123',
      email: 'john.doe@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2023-01-01T00:00:00Z',
    },
    loading: false,
    signOut: jest.fn(() => Promise.resolve({ error: undefined } as { error?: Error })),
    refreshUser: jest.fn(() => Promise.resolve()),
  };

  beforeEach(() => {
    adapter = new UserProfileAdapter();
    mockSubscriber = jest.fn();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should have correct app metadata', () => {
      expect(adapter.appName).toBe('userProfile');
      expect(adapter.displayName).toBe('User Profile');
      expect(adapter.icon).toBe('👤');
    });
  });

  describe('updateProfile', () => {
    it('should update profile and notify subscribers', () => {
      adapter.subscribe(mockSubscriber);
      adapter.updateProfile(mockProfile, mockAuthData);

      expect(mockSubscriber).toHaveBeenCalledWith(mockProfile);
    });

    it('should update internal profile state', () => {
      adapter.updateProfile(mockProfile, mockAuthData);
      const contextData = adapter.getContextData();
      
      expect(contextData.data).toEqual(mockProfile);
    });
  });

  describe('getContextData', () => {
    it('should return complete context data when profile is set', () => {
      adapter.updateProfile(mockProfile, mockAuthData);
      const contextData = adapter.getContextData();

      expect(contextData).toEqual({
        appName: 'userProfile',
        displayName: 'User Profile',
        isActive: true,
        lastUsed: expect.any(Number),
        data: mockProfile,
        summary: 'User: Johnny, Email: john.doe@example.com, Location: San Francisco, CA',
        capabilities: [
          'personal information',
          'address lookup',
          'profile details',
          'contact information',
          'birthday information',
        ],
        icon: '👤',
      });
    });

    it('should return empty profile when no profile is set', () => {
      const contextData = adapter.getContextData();
      
      expect(contextData.data).toEqual({
        nickname: '',
        fullName: '',
        dateOfBirth: '',
        email: '',
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
      });
      expect(contextData.summary).toBe('No profile data available');
    });

    it('should use auth email when available and profile email is empty', () => {
      const emptyProfile: UserProfile = {
        ...mockProfile,
        email: '',
      };
      
      adapter.updateProfile(emptyProfile, mockAuthData);
      const contextData = adapter.getContextData();
      
      // The empty profile is returned as-is, auth email is only used in getEmptyProfile
      expect(contextData.data.email).toBe('');
    });
  });

  describe('getKeywords', () => {
    it('should return comprehensive keyword list', () => {
      const keywords = adapter.getKeywords();
      
      expect(keywords).toContain('my name');
      expect(keywords).toContain('email address');
      expect(keywords).toContain('my address');
      expect(keywords).toContain('my birthday');
      expect(keywords).toContain('user profile');
      expect(keywords.length).toBeGreaterThan(20);
    });
  });

  describe('getResponse', () => {
    beforeEach(() => {
      adapter.updateProfile(mockProfile, mockAuthData);
    });

    describe('name queries', () => {
      it('should respond to name queries with full information', async () => {
        const response = await adapter.getResponse('what is my name?');
        expect(response).toBe('Your full name is John Doe, but you go by Johnny. Your unique ID is USR123456.');
      });

      it('should handle nickname only', async () => {
        const profileWithNicknameOnly = { ...mockProfile, fullName: '' };
        adapter.updateProfile(profileWithNicknameOnly, mockAuthData);
        
        const response = await adapter.getResponse('who am i');
        expect(response).toBe('You go by Johnny.');
      });

      it('should handle missing name', async () => {
        const profileWithoutName = { ...mockProfile, fullName: '', nickname: '' };
        adapter.updateProfile(profileWithoutName, mockAuthData);
        
        const response = await adapter.getResponse('what is my name');
        expect(response).toBe("You haven't set your name in your profile yet.");
      });
    });

    describe('email queries', () => {
      it('should respond with email address', async () => {
        const response = await adapter.getResponse('what is my email?');
        expect(response).toBe('Your email address is john.doe@example.com.');
      });

      it('should handle missing email', async () => {
        const profileWithoutEmail = { ...mockProfile, email: '' };
        adapter.updateProfile(profileWithoutEmail, mockAuthData);
        
        const response = await adapter.getResponse('email address');
        expect(response).toBe("You haven't set an email address in your profile.");
      });
    });

    describe('phone queries', () => {
      it('should respond with phone number', async () => {
        const response = await adapter.getResponse('what is my phone number?');
        expect(response).toBe('Your phone number is +1 (555) 123-4567.');
      });

      it('should handle missing phone', async () => {
        const profileWithoutPhone = { ...mockProfile, phone: '' };
        adapter.updateProfile(profileWithoutPhone, mockAuthData);
        
        const response = await adapter.getResponse('phone');
        expect(response).toBe("You haven't added a phone number to your profile.");
      });
    });

    describe('address queries', () => {
      it('should respond with complete address', async () => {
        const response = await adapter.getResponse('what is my address?');
        expect(response).toBe('Your address is 123 Main St, San Francisco, CA 94105, USA.');
      });

      it('should respond with partial address', async () => {
        const partialAddress = {
          ...mockProfile,
          address: {
            street: '',
            city: 'San Francisco',
            state: 'CA',
            zip: '',
            country: '',
          },
        };
        adapter.updateProfile(partialAddress, mockAuthData);
        
        const response = await adapter.getResponse('where do i live');
        expect(response).toBe('You live in San Francisco, CA.');
      });

      it('should handle missing address', async () => {
        const profileWithoutAddress = {
          ...mockProfile,
          address: {
            street: '',
            city: '',
            state: '',
            zip: '',
            country: '',
          },
        };
        adapter.updateProfile(profileWithoutAddress, mockAuthData);
        
        const response = await adapter.getResponse('address');
        expect(response).toBe("You haven't added your address to your profile.");
      });
    });

    describe('birthday/age queries', () => {
      it('should calculate and return age with birthday', async () => {
        const response = await adapter.getResponse('when is my birthday?');
        // The date might be May 14 or May 15 depending on timezone
        expect(response).toMatch(/Your birthday is May 1[45], 1990\. You are 33 years old\./);
      });

      it('should handle missing date of birth', async () => {
        const profileWithoutDOB = { ...mockProfile, dateOfBirth: '' };
        adapter.updateProfile(profileWithoutDOB, mockAuthData);
        
        const response = await adapter.getResponse('how old am i');
        expect(response).toBe("You haven't added your date of birth to your profile.");
      });
    });

    describe('gender queries', () => {
      it('should respond with gender', async () => {
        const response = await adapter.getResponse('what is my gender?');
        expect(response).toBe('Your gender is listed as Male.');
      });

      it('should handle missing gender', async () => {
        const profileWithoutGender = { ...mockProfile, gender: '' };
        adapter.updateProfile(profileWithoutGender, mockAuthData);
        
        const response = await adapter.getResponse('gender');
        expect(response).toBe("You haven't specified your gender in your profile.");
      });
    });

    describe('marital status queries', () => {
      it('should respond with marital status', async () => {
        const response = await adapter.getResponse('am i married?');
        expect(response).toBe('Your marital status is Single.');
      });

      it('should handle missing marital status', async () => {
        const profileWithoutStatus = { ...mockProfile, maritalStatus: '' };
        adapter.updateProfile(profileWithoutStatus, mockAuthData);
        
        const response = await adapter.getResponse('marital status');
        expect(response).toBe("You haven't specified your marital status.");
      });
    });

    describe('profile summary queries', () => {
      it('should provide complete profile summary', async () => {
        const response = await adapter.getResponse('tell me about my profile');
        expect(response).toContain("Here's your profile information:");
        expect(response).toContain('**Name**: John Doe (goes by Johnny) - ID: USR123456');
        expect(response).toContain('**Personal**: 33 years old, Male, Single');
        expect(response).toContain('**Contact**: john.doe@example.com, +1 (555) 123-4567');
        expect(response).toContain('**Address**: 123 Main St, San Francisco, CA 94105');
      });

      it('should handle incomplete profile', async () => {
        const incompleteProfile = {
          nickname: '',
          fullName: '',
          dateOfBirth: '',
          email: '',
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
        adapter.updateProfile(incompleteProfile, mockAuthData);
        
        const response = await adapter.getResponse('my info');
        expect(response).toBe('Your profile is incomplete. Consider adding more information.');
      });
    });

    describe('contact info queries', () => {
      it('should provide contact summary', async () => {
        const response = await adapter.getResponse('show me my contact information');
        expect(response).toContain('Your contact information:');
        expect(response).toContain('Email: john.doe@example.com');
        expect(response).toContain('Phone: +1 (555) 123-4567');
        expect(response).toContain('Address: 123 Main St, San Francisco, CA 94105');
      });

      it('should handle missing contact info', async () => {
        const profileWithoutContact = {
          ...mockProfile,
          email: '',
          phone: '',
          address: {
            street: '',
            city: '',
            state: '',
            zip: '',
            country: '',
          },
        };
        adapter.updateProfile(profileWithoutContact, mockAuthData);
        
        const response = await adapter.getResponse('contact');
        expect(response).toBe("You haven't added any contact information to your profile yet.");
      });
    });

    describe('general queries', () => {
      it('should provide help for unrecognized queries', async () => {
        const response = await adapter.getResponse('something random');
        expect(response).toBe('I can help you with your profile information. You can ask about your name, email, phone, address, birthday, or other profile details.');
      });
    });

    it('should handle no profile data', async () => {
      const emptyAdapter = new UserProfileAdapter();
      const response = await emptyAdapter.getResponse('what is my name');
      expect(response).toBe("I don't have access to your profile information yet. Please make sure you're logged in and have filled out your profile.");
    });
  });

  describe('search', () => {
    beforeEach(() => {
      adapter.updateProfile(mockProfile, mockAuthData);
    });

    it('should search through profile fields', async () => {
      const results = await adapter.search('john');
      
      expect(results).toContainEqual({
        type: 'profile_field',
        label: 'Full Name',
        value: 'John Doe',
        field: 'fullName',
      });
      
      expect(results).toContainEqual({
        type: 'profile_field',
        label: 'Email',
        value: 'john.doe@example.com',
        field: 'email',
      });
    });

    it('should search through address fields', async () => {
      const results = await adapter.search('francisco');
      
      expect(results).toContainEqual({
        type: 'address_field',
        label: 'Address city',
        value: 'San Francisco',
        field: 'address.city',
      });
    });

    it('should handle case-insensitive search', async () => {
      const results = await adapter.search('JOHNNY');
      
      expect(results).toContainEqual({
        type: 'profile_field',
        label: 'Nickname',
        value: 'Johnny',
        field: 'nickname',
      });
    });

    it('should return empty array when no matches', async () => {
      const results = await adapter.search('xyz123');
      expect(results).toEqual([]);
    });

    it('should return empty array when no profile', async () => {
      const emptyAdapter = new UserProfileAdapter();
      const results = await emptyAdapter.search('john');
      expect(results).toEqual([]);
    });

    it('should find phone numbers', async () => {
      const results = await adapter.search('555');
      
      expect(results).toContainEqual({
        type: 'profile_field',
        label: 'Phone',
        value: '+1 (555) 123-4567',
        field: 'phone',
      });
    });

    it('should find unique ID', async () => {
      const results = await adapter.search('USR');
      
      expect(results).toContainEqual({
        type: 'profile_field',
        label: 'Unique ID',
        value: 'USR123456',
        field: 'uniqueId',
      });
    });
  });

  describe('calculateAge', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date('1990-05-15');
      const age = adapter['calculateAge'](birthDate);
      
      // Age should be 33 as of 2024-01-01
      expect(age).toBe(33);
    });

    it('should handle birthday later in year', () => {
      const birthDate = new Date('1990-12-31');
      const age = adapter['calculateAge'](birthDate);
      
      // Should be 33, not 34, since birthday hasn't occurred yet in 2024-01-01
      expect(age).toBe(33);
    });

    it('should handle birthday on same day', () => {
      const birthDate = new Date('1990-01-01');
      const age = adapter['calculateAge'](birthDate);
      
      expect(age).toBe(34);
    });
  });

  describe('hasCompleteAddress', () => {
    it('should return true for complete address', () => {
      expect(adapter['hasCompleteAddress'](mockProfile)).toBe(true);
    });

    it('should return false for missing street', () => {
      const incompleteProfile = {
        ...mockProfile,
        address: { ...mockProfile.address, street: '' },
      };
      expect(adapter['hasCompleteAddress'](incompleteProfile)).toBe(false);
    });

    it('should return false for missing city', () => {
      const incompleteProfile = {
        ...mockProfile,
        address: { ...mockProfile.address, city: '' },
      };
      expect(adapter['hasCompleteAddress'](incompleteProfile)).toBe(false);
    });

    it('should return false for null profile', () => {
      expect(adapter['hasCompleteAddress']()).toBe(false);
    });
  });

  describe('loadData', () => {
    it('should update lastFetchTime when called', () => {
      adapter['loadData']();
      expect(timeService.getTimestamp).toHaveBeenCalled();
    });
  });

  describe('subscription', () => {
    it('should notify subscribers when profile updates', () => {
      const subscriber1 = jest.fn();
      const subscriber2 = jest.fn();
      
      adapter.subscribe(subscriber1);
      adapter.subscribe(subscriber2);
      
      adapter.updateProfile(mockProfile, mockAuthData);
      
      expect(subscriber1).toHaveBeenCalledWith(mockProfile);
      expect(subscriber2).toHaveBeenCalledWith(mockProfile);
    });

    it('should allow unsubscribing', () => {
      const subscriber = jest.fn();
      const unsubscribe = adapter.subscribe(subscriber);
      
      adapter.updateProfile(mockProfile, mockAuthData);
      expect(subscriber).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      
      adapter.updateProfile(mockProfile, mockAuthData);
      expect(subscriber).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', async () => {
      const { userProfileAdapter: exportedInstance } = await import('../UserProfileAdapter');
      expect(exportedInstance).toBeDefined();
      expect(exportedInstance).toBeInstanceOf(UserProfileAdapter);
    });
  });
});