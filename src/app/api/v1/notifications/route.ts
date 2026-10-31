import { NextRequest, NextResponse } from "next/server";
import { getUser, prisma, unauthorized } from "@/lib/server";

export async function GET(request:NextRequest){
 const user=await getUser(request); if(!user)return unauthorized();
 const [notifications,unread,announcements]=await Promise.all([
  prisma.notification.findMany({where:{user_id:user.employeeId},orderBy:{created_at:"desc"},take:100}),
  prisma.notification.count({where:{user_id:user.employeeId,is_read:false}}),
  prisma.announcement.findMany({orderBy:{posted_on:"desc"},take:50}),
 ]);
 return NextResponse.json({success:true,notifications,unread,announcements});
}
