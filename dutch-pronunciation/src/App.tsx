import { useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Exercise from "@/pages/exercise";
import Reward from "@/pages/reward";
import Settings from "@/pages/settings";

const PAGE_DEPTH: Record<string, number> = {
  "/": 1,
  "/settings": 2,
  "/exercise": 2,
  "/reward": 3,
};

const slideVariants = {
  initial: (dir: number) => ({
    x: dir >= 0 ? "100%" : "-30%",
    opacity: dir >= 0 ? 1 : 0.3,
  }),
  animate: { x: "0%", opacity: 1 },
  exit: (dir: number) => ({
    x: dir >= 0 ? "-30%" : "100%",
    opacity: dir >= 0 ? 0.3 : 1,
  }),
};

function AnimatedRoutes() {
  const [location] = useLocation();

  const prevLocationRef = useRef(location);
  const directionRef = useRef(0);

  if (location !== prevLocationRef.current) {
    const prevDepth = PAGE_DEPTH[prevLocationRef.current] ?? 0;
    const currDepth = PAGE_DEPTH[location] ?? 0;
    directionRef.current = currDepth >= prevDepth ? 1 : -1;
    prevLocationRef.current = location;
  }

  const dir = directionRef.current;

  return (
    <div className="relative w-full overflow-x-hidden">
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={location}
          custom={dir}
          variants={slideVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: "tween", duration: 0.26, ease: [0.32, 0, 0.18, 1] }}
          className="w-full"
        >
          <ErrorBoundary>
            <Switch location={location}>
              <Route path="/"         component={Home} />
              <Route path="/exercise" component={Exercise} />
              <Route path="/reward"   component={Reward} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </ErrorBoundary>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AnimatedRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
