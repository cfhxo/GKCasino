import { useContext, useEffect, useRef, useState } from "react";
import { getUser, getInventory } from "../../services/users/UserServices";
import { FiFilter } from 'react-icons/fi';
import UserInfo from "./UserInfo";
import Item from "../../components/Item";
import UserContext from "../../UserContext";
import Skeleton from "react-loading-skeleton";
import Filters from "../../components/InventoryFilters";
import Pagination from "../../components/Pagination";
import { User } from '../../components/Types';
import { toast } from "react-toastify";

interface Inventory {
  totalPages: number;
  currentPage: number;
  items: any[];
}

interface ProfileProps {
  userId: string; // The ID of the profile being viewed
  currentUserId: string; // The ID of the logged-in user
}

const Profile: React.FC<ProfileProps> = () => {
  const { userData } = useContext(UserContext);
  const currentUserId = userData?.id; // Get the logged-in user's ID from context
  const id = window.location.pathname.split("/")[2]; // Extract userId from the URL

  const [isFriendRequestSent, setIsFriendRequestSent] = useState(false);
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingInventory, setLoadingInventory] = useState<boolean>(true);
  const [inventory, setInventory] = useState<Inventory>();
  const [invItems, setInvItems] = useState<any[]>([]);
  const [isSameUser, setIsSameUser] = useState<boolean>(false);
  const [refresh, setRefresh] = useState<boolean>(false);
  const [openFilters, setOpenFilters] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [filters, setFilters] = useState({
    name: '',
    rarity: '',
    sortBy: 'newer',
    order: 'asc',
  });
  const delayDebounceFn = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (invItems?.length > 0) {
      delayDebounceFn.current = setTimeout(() => {
        getInventoryInfo();
      }, 1000);
      return () => {
        if (delayDebounceFn.current) {
          clearTimeout(delayDebounceFn.current);
        }
      };
    }
  }, [filters]);

  const getUserInfo = async () => {
    try {
      const response = await getUser(id);
      setUser(response);
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  const getInventoryInfo = async (newPage?: boolean) => {
    setLoadingInventory(true);
    try {
      const response = await getInventory(
        id,
        page,
        filters
      );
      setInventory(response);
      newPage
        ? setInvItems((prev) => [...prev, ...response.items])
        : setInvItems(response.items);
    } catch (error) {
      console.log(error);
    }
    setLoadingInventory(false);
  };

  const checkFriendRequestStatus = async () => {
    if (!currentUserId) {
        console.log("[FriendsService] currentUserId is undefined. Skipping friend request status check.");
        return;
    }

    try {
        console.log("[FriendsService] Checking friend request status for the viewed user...");
        console.log("[FriendsService] Current profile ID:", id);
        console.log("[FriendsService] Current user ID:", currentUserId);

        const response = await fetch(`https://backend.casino.ghana-kebabs.com/users/${id}`);
        if (!response.ok) {
            throw new Error("[FriendsService] Failed to fetch user data");
        }

        const viewedUserData = await response.json();
        console.log("[FriendsService] Viewed user data fetched:", viewedUserData);

        // Log the friendRequests array for debugging
        console.log("[FriendsService] Friend requests array:", viewedUserData.friendRequests);

        // Check if the logged-in user is in the viewed user's friendRequests array
        const hasSentRequest = viewedUserData.friendRequests.some(
            (request: any) => String(request.senderId) === String(currentUserId)
        );

        // Log each comparison for debugging
        viewedUserData.friendRequests.forEach((request: any) => {
            console.log(
                "[FriendsService] Comparing senderId:",
                String(request.senderId),
                "with currentUserId:",
                String(currentUserId)
            );
        });

        console.log(`[FriendsService] Has ${currentUserId} sent a request to ${id}:`, hasSentRequest);

        setIsFriendRequestSent(hasSentRequest); // Update the button state
    } catch (error) {
        console.error("[FriendsService] Error checking friend request status:", error);
        setIsFriendRequestSent(false); // Reset to false in case of an error
    }
};

  const sendFriendRequest = async () => {
    try {
        console.log("[FriendsService] Sending friend request...");
        console.log("[FriendsService] Sender ID:", currentUserId);
        console.log("[FriendsService] Receiver ID:", id);

        const response = await fetch("https://backend.casino.ghana-kebabs.com/api/friends/request", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ senderId: currentUserId, receiverId: id }),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("[FriendsService] Error response:", text);
            toast.error("Failed to send friend request");
            return;
        }

        const data = await response.json();
        console.log("[FriendsService] Friend request sent successfully:", data);

        setIsFriendRequestSent(true);
        toast.success(data.message);
    } catch (error) {
        console.error("[FriendsService] Error sending friend request:", error);
        toast.error("Failed to send friend request");
    }
};

  useEffect(() => {
    console.log("[FriendsService] Checking if the logged-in user is the same as the viewed user...");
    if (userData) {
        if (userData.id === id) {
            setIsSameUser(true);
        } else {
            setIsSameUser(false);
        }
    }
}, [userData, id]); // Add `id` as a dependency

useEffect(() => {
    if (refresh) {
        getUserInfo();
        getInventoryInfo();
        setRefresh(false);
    }
}, [refresh, id]); // Add `id` as a dependency

useEffect(() => {
    getInventoryInfo();
}, [page, id]); // Add `id` as a dependency

useEffect(() => {
    getUserInfo();
    checkFriendRequestStatus(); // Check if a friend request has already been sent
}, [id]); // Add `id` as a dependency

useEffect(() => {
    console.log("[FriendsService] Resetting state for new profile...");
    setIsFriendRequestSent(false); // Reset friend request state
    setUser(undefined); // Reset user state
    setLoading(true); // Reset loading state
}, [id]);

useEffect(() => {
    console.log("[FriendsService] Fetching data for new profile...");
    getUserInfo();
    checkFriendRequestStatus();
}, [id]);

useEffect(() => {
    console.log("[FriendsService] Fetching inventory for new profile...");
    getInventoryInfo();
}, [page, id]);

useEffect(() => {
    if (userData && userData.id) {
        console.log("[FriendsService] userData is ready. Running friend request status check...");
        checkFriendRequestStatus();
    }
}, [userData, id]); // Add `userData` and `id` as dependencies

if (!userData) {
    return <div>Loading...</div>; // Or a skeleton loader
}

  return (
    <div className="flex flex-col items-center w-screen">
      <div className="flex flex-col max-w-[1312px] py-4 w-full">
        <div className="flex items-center justify-between pb-7">
          {loading ? (
            <Skeleton
              circle={true}
              height={144}
              width={144}
              highlightColor="#161427"
              baseColor="#1c1a31"
            />
          ) : (
            user && (
              <div className="flex items-center gap-4">
                <UserInfo
                  user={user}
                  isSameUser={isSameUser}
                  setRefresh={setRefresh}
                />
              </div>
            )
          )}
        </div>

        {/* Actions Section */}
        {!isSameUser && (
          <div className="flex flex-col items-start gap-4 pb-7">
            <h2 className="text-xl font-bold">Actions</h2>
            <button
              onClick={sendFriendRequest}
              disabled={isFriendRequestSent}
              className={`p-2 rounded ${isFriendRequestSent ? "bg-gray-500" : "bg-blue-500 hover:bg-blue-600"}`}
            >
              {isFriendRequestSent ? "Request Sent" : "Add Friend"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center w-full bg-[#141225] min-h-screen">
        <div className="flex flex-col p-8 gap-2 items-center w-full max-w-[1312px]">
          <h2 className="text-2xl font-bold py-4">Inventory</h2>
          <div className="flex flex-col w-full items-end mr-[70px] gap-4 -mt-10">
            <div onClick={() => setOpenFilters(!openFilters)} className="border p-2 rounded-md cursor-pointer">
              <FiFilter className="text-2xl" />
            </div>
            {openFilters && <Filters filters={filters} setFilters={setFilters} onKeyPress={handleEnterPress} />}
          </div>
          {inventory &&
            inventory.totalPages > 1 &&
            (
              <Pagination totalPages={inventory.totalPages} currentPage={inventory.currentPage} setPage={setPage} />
            )}
          <div className="flex flex-wrap gap-6 justify-center">
            {loadingInventory ? (
              { array: Array(12).fill(0) }.array.map((_, i) => (
                <Skeleton
                  width={176}
                  height={216}
                  highlightColor="#161427"
                  baseColor="#1c1a31"
                  key={i}
                />
              ))
            ) : invItems && Object.keys(invItems).length > 0 ? (
              invItems.map((item: any, i: number) => (
                <Item
                  item={item}
                  key={item?.name + i}
                  fixable={isSameUser}
                  setRefresh={setRefresh}
                />
              ))
            ) : (
              <h2>No items</h2>
            )}
          </div>
          {inventory &&
            inventory.totalPages > 1 &&
            (
              <Pagination totalPages={inventory.totalPages} currentPage={inventory.currentPage} setPage={setPage} />
            )}
        </div>
      </div>
    </div>
  );
};

export default Profile;