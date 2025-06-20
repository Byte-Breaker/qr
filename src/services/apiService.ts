
import axios from 'axios';
import { LogEntry, TransactionType, User } from '@/utils/mockData';

const API_URL = 'https://api.mocki.io/v2/51597ef3';

export const apiService = {
  // Authentication
  async login(email: string, password: string): Promise<User> {
    try {
      // In real implementation, this would be a real API call
      // For now, simulate a network request with timeout
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (email === 'admin@company.com' && password === 'admin123') {
        return {
          id: 'user-001',
          name: 'Admin User',
          email: 'admin@company.com',
          department: 'Management',
          role: 'admin',
          avatar: null
        };
      } else if (email === 'user@company.com' && password === 'user123') {
        return {
          id: 'user-002',
          name: 'Regular User',
          email: 'user@company.com',
          department: 'Engineering',
          role: 'user',
          avatar: null
        };
      }
      
      throw new Error('Invalid credentials');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Logs
  async getUserLogs(userId: string): Promise<LogEntry[]> {
    try {
      // In real implementation, this would fetch from a real API
      // For now, we'll simulate network latency
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await axios.get(`${API_URL}/logs`);
      const allLogs = response.data || [];
      
      return allLogs.filter((log: LogEntry) => log.userId === userId);
    } catch (error) {
      console.error('Error fetching user logs:', error);
      // Fallback to mock data in case the API fails
      const { mockLogs } = await import('@/utils/mockData');
      return mockLogs.filter(log => log.userId === userId);
    }
  },
  
  async getAllLogs(): Promise<LogEntry[]> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await axios.get(`${API_URL}/logs`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching all logs:', error);
      const { mockLogs } = await import('@/utils/mockData');
      return mockLogs;
    }
  },
  
  async createLog(logData: Omit<LogEntry, 'id'>): Promise<LogEntry> {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // In a real API, this would be saved to the database
      // For now, we'll simulate creating a new log with an ID
      const newLog: LogEntry = {
        id: `log-${Date.now()}`,
        ...logData
      };
      
      return newLog;
    } catch (error) {
      console.error('Error creating log:', error);
      throw error;
    }
  },
  
  // Users/Employees
  async getAllEmployees(): Promise<User[]> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await axios.get(`${API_URL}/employees`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching employees:', error);
      const { mockEmployees } = await import('@/utils/mockData');
      return mockEmployees;
    }
  }
};

