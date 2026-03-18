import { createClient } from "../client";
import { TabFile } from "@/types/TabFile";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient();

export class TabStorageService {
  private bucketName = "gp-files";

  constructor(private userId: string) {}

  async uploadTab(
    file: File,
    metadata: TabFile["metadata"] = {},
  ): Promise<TabFile | null> {
    try {
      // generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${this.userId}${fileName}`;

      // upload to supabase storage
      const { error: uploadError } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // get the file's url
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      const { data: tabData, error: dbError } = await supabase
        .from("tabs")
        .insert({
          name: file.name,
          size: file.size,
          type: file.type,
          user_id: this.userId,
          storage_path: filePath,
          public_url: urlData.publicUrl,
          metadata,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return tabData;
    } catch (error) {
      console.error("Error uploading tab: ", error);
      return null;
    }
  }

  async getUserTabs(): Promise<TabFile[]> {
    try {
      const { data, error } = await supabase
        .from('tabs')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false});

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tabs: ', error);
      return [];
    }
  }

  async getTab(tabId: string): Promise<TabFile | null> {
    try { 
      const { data, error } = await supabase
        .from('tabs')
        .select('*')
        .eq('id', tabId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching tabs: ', error);
      return null;
    }
  }

  async downloadTab(tabId: string): Promise<Blob | null> {
    try {
      const tab = await this.getTab(tabId);
      if (!tab) return null;
      
      const { data, error} = await supabase.storage
        .from(this.bucketName)
        .download(tab.storage_path);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error downloading tab: ', error);
      return null;
    }
  }
  
  async deleteTab(tabId: string): Promise<boolean> {
    try {
      const tab = await this.getTab(tabId);
      if (!tab) return false;

      const { error: storageError } = await supabase.storage
        .from(this.bucketName)
        .remove([tab.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('tabs')
        .delete()
        .eq('id', tabId);

      if (dbError) throw dbError;

      return true;
    } catch (error) {
      console.error('Error deleting tab: ', error);
      return false;
    }
  }

  async updateMetadata(tabId: string, metadata: Partial<TabFile['metadata']>): Promise<TabFile | null> {
    try {
      const { data, error } = await supabase
        .from('tabs')
        .update({ metadata, updated_at: new Date().toISOString() })
        .eq('id', tabId)
        .select()
        .single()
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating metadata: ', error);
      return null;
    }
  }
}
