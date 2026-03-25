export default interface Tab {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  created_at: string;
  created_by: string;
  profiles?: {
    display_name: string;
  };
  file_path?: string;
}