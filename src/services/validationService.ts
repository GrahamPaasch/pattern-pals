/**
 * Data validation service
 * Provides comprehensive validation for all data types in the app
 */

import { User, Pattern, ExperienceLevel, PropType, PatternStatus } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ValidationRule<T> {
  field: keyof T;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => string | null;
}

class ValidationService {
  /**
   * Validate user data
   */
  static validateUser(user: Partial<User>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!user.name || user.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (user.name.length < 2) {
      errors.push('Name must be at least 2 characters');
    } else if (user.name.length > 50) {
      errors.push('Name must be less than 50 characters');
    }

    // Note: Email is no longer required for anonymous authentication

    if (!user.experience) {
      errors.push('Experience level is required');
    } else if (!this.isValidExperienceLevel(user.experience)) {
      errors.push('Invalid experience level');
    }

    if (!user.preferredProps || user.preferredProps.length === 0) {
      errors.push('At least one preferred prop type is required');
    } else {
      const invalidProps = user.preferredProps.filter(prop => !this.isValidPropType(prop));
      if (invalidProps.length > 0) {
        errors.push(`Invalid prop types: ${invalidProps.join(', ')}`);
      }
    }

    // Warnings for data quality
    if (user.knownPatterns && user.knownPatterns.length === 0) {
      warnings.push('Consider adding some patterns you know to help find better matches');
    }

    if (user.availability && user.availability.length === 0) {
      warnings.push('Adding your availability will help others know when you can practice');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate pattern data
   */
  static validatePattern(pattern: Partial<Pattern>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!pattern.name || pattern.name.trim().length === 0) {
      errors.push('Pattern name is required');
    } else if (pattern.name.length < 2) {
      errors.push('Pattern name must be at least 2 characters');
    } else if (pattern.name.length > 100) {
      errors.push('Pattern name must be less than 100 characters');
    }

    if (!pattern.difficulty) {
      errors.push('Difficulty level is required');
    } else if (!this.isValidExperienceLevel(pattern.difficulty)) {
      errors.push('Invalid difficulty level');
    }

    if (!pattern.requiredJugglers || pattern.requiredJugglers < 1) {
      errors.push('Number of required jugglers must be at least 1');
    } else if (pattern.requiredJugglers > 10) {
      warnings.push('Patterns with more than 10 jugglers are rare - please verify this is correct');
    }

    if (!pattern.props || pattern.props.length === 0) {
      errors.push('At least one prop type is required');
    } else {
      const invalidProps = pattern.props.filter(prop => !this.isValidPropType(prop));
      if (invalidProps.length > 0) {
        errors.push(`Invalid prop types: ${invalidProps.join(', ')}`);
      }
    }

    if (!pattern.description || pattern.description.trim().length === 0) {
      errors.push('Pattern description is required');
    } else if (pattern.description.length < 10) {
      warnings.push('Consider adding a more detailed description to help others understand the pattern');
    }

    // Technical validation
    if (pattern.numberOfProps && pattern.numberOfProps < 1) {
      errors.push('Number of props must be at least 1');
    }

    if (pattern.period && pattern.period < 1) {
      errors.push('Pattern period must be at least 1');
    }

    // Siteswap validation
    if (pattern.siteswap) {
      const siteswapValidation = this.validateSiteswap(pattern.siteswap);
      if (!siteswapValidation.isValid) {
        errors.push(...siteswapValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate siteswap notation
   */
  private static validateSiteswap(siteswap: Pattern['siteswap']): ValidationResult {
    const errors: string[] = [];

    if (siteswap.global) {
      // Basic siteswap validation - check for valid characters
      const validSiteswapPattern = /^[\d\w\(\),p\[\]x\-\s]+$/;
      if (!validSiteswapPattern.test(siteswap.global)) {
        errors.push('Global siteswap contains invalid characters');
      }
    }

    if (siteswap.local) {
      Object.entries(siteswap.local).forEach(([juggler, notation]) => {
        const validSiteswapPattern = /^[\d\w\(\),p\[\]x\-\s]+$/;
        if (!validSiteswapPattern.test(notation)) {
          errors.push(`Local siteswap for ${juggler} contains invalid characters`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate pattern status update
   */
  static validatePatternStatus(userId: string, patternId: string, status: PatternStatus): ValidationResult {
    const errors: string[] = [];

    if (!userId || userId.trim().length === 0) {
      errors.push('User ID is required');
    }

    if (!patternId || patternId.trim().length === 0) {
      errors.push('Pattern ID is required');
    }

    if (!status || !['known', 'want_to_learn', 'want_to_avoid'].includes(status)) {
      errors.push('Invalid pattern status');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Email validation
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Experience level validation
   */
  private static isValidExperienceLevel(level: string): level is ExperienceLevel {
    return ['Beginner', 'Intermediate', 'Advanced'].includes(level);
  }

  /**
   * Prop type validation
   */
  private static isValidPropType(prop: string): prop is PropType {
    return ['clubs', 'balls', 'rings'].includes(prop);
  }

  /**
   * Generic validation using rules
   */
  static validateWithRules<T>(data: T, rules: ValidationRule<T>[]): ValidationResult {
    const errors: string[] = [];

    rules.forEach(rule => {
      const value = data[rule.field];

      // Required field check
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${String(rule.field)} is required`);
        return;
      }

      // Skip other validations if field is not required and empty
      if (!rule.required && (value === undefined || value === null || value === '')) {
        return;
      }

      // String validations
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${String(rule.field)} must be at least ${rule.minLength} characters`);
        }

        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${String(rule.field)} must be less than ${rule.maxLength} characters`);
        }

        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${String(rule.field)} format is invalid`);
        }
      }

      // Custom validation
      if (rule.customValidator) {
        const customError = rule.customValidator(value);
        if (customError) {
          errors.push(customError);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize user input
   */
  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Validate and sanitize user input
   */
  static sanitizeUserInput(user: Partial<User>): Partial<User> {
    return {
      ...user,
      name: user.name ? this.sanitizeString(user.name) : user.name,
      // Note: Email field removed for anonymous authentication
    };
  }
}

export { ValidationService };
