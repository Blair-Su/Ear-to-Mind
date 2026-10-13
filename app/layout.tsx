import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Ear to Mind — From what people say to how they think.",description:"From what people say to how they think.",icons:{icon:"/favicon.svg?v=logo-1"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
