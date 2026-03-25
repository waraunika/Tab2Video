import AlphaTabViewer from "@/components/tabs/AlphaTabViewer";
import Navbar from "@/components/Navbar";
import Footer from "@/components/footer";
import { ArrowRight, Play, Music, Video, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col items-center">
        <Navbar />
        
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Guitar Tabs To Video
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Where guitar tabs come to life. Transform your Guitar Pro files into 
              stunning animated hand videos that you can play along with.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link 
                href="/auth/sign-up" 
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-lg font-medium hover:bg-secondary transition-colors cursor-pointer"
                href="#demo"
              >
                <Play className="w-4 h-4" /> See Demo
              </a>
            </div>
          </div>
        </section>

        <section className="w-full bg-secondary/50 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <Music className="w-8 h-8 text-primary" />
                </div>

                <h3 className="text-lg font-semibold">Guitar Pro Support</h3>

                <p className="text-muted-foreground text-sm">
                  Upload .gp files and our AlphaTab integration handles the rest
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <Video className="w-8 h-8 text-primary" />
                </div>

                <h3 className="text-lg font-semibold">
                  Animated Hands
                </h3>

                <p className="text-muted-foreground text-sm">
                  Watch realistic hand animations that follow your tabs precisely
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>

                <h3 className="text-lg font-semibold">
                  Interactive Player

                </h3>

                <p className="text-muted-foreground text-sm">
                  Loop sections, use metronome, print tabs - everything you need
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="demo" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 fade-in">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">See It In Action</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Here&apos;s a simple demonstration of what we do. Load a tab, play along, 
              and see how your playing translates to video.
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
            <AlphaTabViewer
              editorModeAvailable={true}
            />
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}