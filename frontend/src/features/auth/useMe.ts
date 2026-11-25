import { useAuth } from "../../app/auth-context.js";
export const useMe = () => useAuth().user;
