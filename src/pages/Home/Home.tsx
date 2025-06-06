import { useState, useEffect } from "react";
import Banner from "./Banner";
import CaseListing from "./CaseListing";
import GameListing from "./GamesListing";
import Leaderboard from "./Leaderboard";
import { getCases } from "../../services/cases/CaseServices";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";

interface BannerProps {
  left: {
    image: string;
    title: string;
    description: string;
    link: string;
  };
}

const Home = () => {
  const [cases, setCases] = useState<any>();
  const [loading, setLoading] = useState<boolean>(true);

  const getNewCases = async () => {
    setLoading(true);
    try {
      const response = await getCases()
      setCases(response);
    } catch {
      setCases([])
      toast.error("Error while connecting to the server")
    }
    setLoading(false);

  };

  useEffect(() => {
    getNewCases();
  }, []);

  const leftContent: BannerProps["left"] = {
    image: "/images/paris.webp",
    title: "NEW UPGRADE GAME",
    description: "Have a cheeky geez at this.",
    link: "/upgrade",
  };

  return (
    <div className="w-full flex justify-center ">
      <div className=" flex-col max-w-[1920px]">
        <Banner left={leftContent} />
        {loading ? (
          <div className="flex items-center justify-center w-full mt-[164px]">
            <div className="flex justiy-center gap-8 max-w-[1600px] flex-col md:flex-row">
              {Array(4)
                .fill(0)
                .map((e, index) => (
                  <div key={index}>
                    <Skeleton
                      width={256}
                      height={348}
                      highlightColor="#161427"
                      baseColor="#1c1a31"
                      key={e + index}
                    />
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <CaseListing
            name="NEW CASES"
            cases={cases.length > 5 ? cases.slice(0, 5) : cases}
          />
        )}
       
        <Leaderboard />

      </div>
    </div>
  );
};

export default Home;
