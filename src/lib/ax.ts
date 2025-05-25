import axios from "axios";

const ax = axios.create({
  baseURL: "/api/v1",
  timeout: 3000,
});

export default ax;