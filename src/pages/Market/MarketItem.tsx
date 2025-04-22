import React, { useState } from "react";
import MainButton from "../../components/MainButton";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Rarities from "../../components/Rarities";

interface Props {
  item: {
    image: string;
    name: string;
    rarity: number;
    _id: string;
    uniqueId: string
    cheapestPrice: number;
    totalListings: number;
  }
}

const MarketItem: React.FC<Props> = ({ item }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const handleImageLoad = () => {
    setLoading(false);
  };

  const color = Rarities.find((rarity) => rarity.id== item?.rarity)?.color || "white";



  return (
    <div className="border border-[#161448] rounded-lg p-4 bg-gradient-to-tr from-[#1D1730] to-[#141333] transition-all duration-500 ease-in-out w-[226px] h-[334px]">
      <div className="flex items-center gap-2 relative">
      <div className={`w-1 h-1 md:h-2 md:w-2 aspect-square rounded-full`} style={{
          backgroundColor: color
        }} />
        <span className="text-lg font-semibold text-white truncate">
      
        {item.name}
        </span>

      </div>
      {loading && (
        <div className="w-full h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#606BC7]"></div>
        </div>
      )}
      <Link to={`/marketplace/item/${item._id}`}>
        <img
          src={item.image}
          alt={item.name}
          className={`mb-2 w-full h-48 object-cover rounded ${loading ? "hidden" : ""
            }`}
          onLoad={handleImageLoad}
        />
      </Link>
      <p className="text-blue-500 text-center py-1 text-ellipsis truncate">
            {item.totalListings} announced
      </p>
      <MainButton textSize="text-sm" text={`Starting at ${new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "DOL",
          minimumFractionDigits: 0,
        })
          .format(item.cheapestPrice)
          .replace("DOL", "G₽")}`} onClick={() => navigate(`/marketplace/item/${item._id}`)}  />

    </div>
  );
};

export default MarketItem;
