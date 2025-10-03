import { DistributionList, DistributionListMember } from '../types';
import { apiClient } from './api';

export class DistributionListService {
  private static generateId(): string {
    return `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateMemberId(): string {
    return `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static async getAllLists(): Promise<DistributionList[]> {
    try {
      return await apiClient.getDistributionLists();
    } catch (error) {
      console.error('Error fetching distribution lists:', error);
      return [];
    }
  }

  static async getListById(id: string): Promise<DistributionList | null> {
    try {
      return await apiClient.getDistributionListById(id);
    } catch (error) {
      console.error('Error fetching distribution list:', error);
      return null;
    }
  }

  static async createList(data: {
    name: string;
    description?: string;
    members?: DistributionListMember[];
    createdBy: string;
  }): Promise<DistributionList> {
    try {
      // Check for duplicate names by fetching all lists
      const existingLists = await this.getAllLists();
      const existingList = existingLists.find(list => 
        list.name.toLowerCase() === data.name.toLowerCase()
      );
      
      if (existingList) {
        throw new Error(`A distribution list with the name "${data.name}" already exists`);
      }

      const newList: DistributionList = {
        id: this.generateId(),
        name: data.name.trim(),
        description: data.description?.trim() || '',
        members: data.members || [],
        createdBy: data.createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return await apiClient.createDistributionList(newList);
    } catch (error) {
      console.error('Error creating distribution list:', error);
      throw error;
    }
  }

  static async updateList(id: string, updates: {
    name?: string;
    description?: string;
  }): Promise<DistributionList> {
    try {
      const existingList = await this.getListById(id);
      if (!existingList) {
        throw new Error('Distribution list not found');
      }

      // Check for duplicate names (excluding current list)
      if (updates.name) {
        const allLists = await this.getAllLists();
        const duplicateList = allLists.find(list => 
          list.id !== id && list.name.toLowerCase() === updates.name!.toLowerCase()
        );
        
        if (duplicateList) {
          throw new Error('A distribution list with this name already exists');
        }
      }

      const updatedData = {
        ...existingList,
        ...updates,
        name: updates.name?.trim() || existingList.name,
        description: updates.description?.trim() ?? existingList.description,
        updatedAt: new Date()
      };

      return await apiClient.updateDistributionList(id, updatedData);
    } catch (error) {
      console.error('Error updating distribution list:', error);
      throw error;
    }
  }

  static async addMember(listId: string, member: {
    name: string;
    email: string;
  }): Promise<DistributionList> {
    try {
      const list = await this.getListById(listId);
      if (!list) {
        throw new Error('Distribution list not found');
      }

      // Check for duplicate email
      const existingMember = list.members.find(m => 
        m.email.toLowerCase() === member.email.toLowerCase()
      );
      
      if (existingMember) {
        throw new Error('This email address is already in the list');
      }

      const newMember: DistributionListMember = {
        id: this.generateMemberId(),
        name: member.name.trim(),
        email: member.email.trim().toLowerCase(),
        addedAt: new Date().toISOString()
      };

      const updatedMembers = [...list.members, newMember];
      const updatedList = {
        ...list,
        members: updatedMembers,
        updatedAt: new Date()
      };

      return await apiClient.updateDistributionList(listId, updatedList);
    } catch (error) {
      console.error('Error adding member to distribution list:', error);
      throw error;
    }
  }

  static async addMembers(listId: string, members: DistributionListMember[]): Promise<DistributionList> {
    try {
      const list = await this.getListById(listId);
      if (!list) {
        throw new Error('Distribution list not found');
      }

      const existingEmails = new Set(list.members.map(m => m.email.toLowerCase()));
      
      // Filter out duplicates and assign proper IDs
      const newMembers = members
        .filter(member => !existingEmails.has(member.email.toLowerCase()))
        .map(member => ({
          ...member,
          id: this.generateMemberId(),
          email: member.email.toLowerCase()
        }));

      const updatedMembers = [...list.members, ...newMembers];
      const updatedList = {
        ...list,
        members: updatedMembers,
        updatedAt: new Date()
      };

      return await apiClient.updateDistributionList(listId, updatedList);
    } catch (error) {
      console.error('Error adding members to distribution list:', error);
      throw error;
    }
  }

  static async removeMember(listId: string, memberId: string): Promise<DistributionList> {
    try {
      const list = await this.getListById(listId);
      if (!list) {
        throw new Error('Distribution list not found');
      }

      const initialMemberCount = list.members.length;
      const updatedMembers = list.members.filter(member => member.id !== memberId);
      
      if (updatedMembers.length === initialMemberCount) {
        throw new Error('Member not found in the list');
      }

      const updatedList = {
        ...list,
        members: updatedMembers,
        updatedAt: new Date()
      };

      return await apiClient.updateDistributionList(listId, updatedList);
    } catch (error) {
      console.error('Error removing member from distribution list:', error);
      throw error;
    }
  }

  static async updateMember(listId: string, memberId: string, updates: {
    name?: string;
    email?: string;
  }): Promise<DistributionList> {
    try {
      const list = await this.getListById(listId);
      if (!list) {
        throw new Error('Distribution list not found');
      }

      const memberIndex = list.members.findIndex(member => member.id === memberId);
      
      if (memberIndex === -1) {
        throw new Error('Member not found in the list');
      }

      // Check for duplicate email (excluding current member)
      if (updates.email) {
        const existingMember = list.members.find(member => 
          member.id !== memberId && 
          member.email.toLowerCase() === updates.email!.toLowerCase()
        );
        
        if (existingMember) {
          throw new Error('This email address is already in the list');
        }
      }

      const updatedMember = {
        ...list.members[memberIndex],
        ...updates,
        name: updates.name?.trim() || list.members[memberIndex].name,
        email: updates.email?.trim().toLowerCase() || list.members[memberIndex].email
      };

      const updatedMembers = [...list.members];
      updatedMembers[memberIndex] = updatedMember;

      const updatedList = {
        ...list,
        members: updatedMembers,
        updatedAt: new Date()
      };

      return await apiClient.updateDistributionList(listId, updatedList);
    } catch (error) {
      console.error('Error updating member in distribution list:', error);
      throw error;
    }
  }

  static async deleteList(id: string): Promise<void> {
    try {
      await apiClient.deleteDistributionList(id);
    } catch (error) {
      console.error('Error deleting distribution list:', error);
      throw error;
    }
  }

  static async searchLists(query: string): Promise<DistributionList[]> {
    try {
      const lists = await this.getAllLists();
      const searchTerm = query.toLowerCase().trim();
      
      if (!searchTerm) {
        return lists;
      }

      return lists.filter(list => 
        list.name.toLowerCase().includes(searchTerm) ||
        list.description.toLowerCase().includes(searchTerm) ||
        list.members.some(member => 
          member.name.toLowerCase().includes(searchTerm) ||
          member.email.toLowerCase().includes(searchTerm)
        )
      );
    } catch (error) {
      console.error('Error searching distribution lists:', error);
      throw error;
    }
  }

  static async getListStats(listId: string): Promise<{
    totalMembers: number;
    createdDate: string;
    lastUpdated: string;
  } | null> {
    try {
      const list = await this.getListById(listId);
      
      if (!list) {
        return null;
      }

      return {
        totalMembers: list.members.length,
        createdDate: new Date(list.createdAt).toLocaleDateString(),
        lastUpdated: new Date(list.updatedAt).toLocaleDateString()
      };
    } catch (error) {
      console.error('Error getting list stats:', error);
      return null;
    }
  }
}