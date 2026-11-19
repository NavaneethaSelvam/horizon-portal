import { NextRequest,NextResponse } from "next/server";
import { getUser,prisma,unauthorized } from "@/lib/server";
import { idSchema, validationError } from "@/lib/validation";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getUser(request);if(!user)return unauthorized();const {id}=await params;if(!idSchema.safeParse(id).success)return validationError("Invalid notification ID.");
 const result=await prisma.notification.updateMany({where:{notification_id:id,user_id:user.employeeId},data:{is_read:true}});
 if(!result.count)return NextResponse.json({success:false,message:"Notification not found."},{status:404});
 return NextResponse.json({success:true});
}
