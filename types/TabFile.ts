export interface TabFile {
  id: string;
  name: string;
  size: number;
  type: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  public_url?: string;
  metadata: {
    title?: string;
    artist?: string;
    album?: string;
    words?: string;
    music?: string;
    copyright?: string;
    tabs?: string;
    instructions?: string;
    notices?: string;
  };
  storage_path: string;
}

export interface TabFileData {
  title: string;
  artist: string;
  album: string;
  is_public: boolean;
}

export interface TabUploadResponse {
  fileUrl: string;
  fileName: string;
  storagePath: string;
  message: string;
}