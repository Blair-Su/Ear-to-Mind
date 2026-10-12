import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Mental Model — Research with perspective",description:"Your research workspace. Interview, understand, and map the way people think.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
