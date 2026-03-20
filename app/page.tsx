import AlphaTabViewer from "@/components/tabs/AlphaTabViewer";
import Navbar from "@/components/Navbar";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <Navbar />
        
        <AlphaTabViewer
          fileUrl={"/file.gp3"}
        />

        <Footer />

      </div>
    </main>
  );
}
