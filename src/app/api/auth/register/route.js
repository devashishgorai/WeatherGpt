import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { setSessionCookie } from '@/lib/auth';
import { normalizePhone, isValidPhone } from '@/lib/phone';
import { blindIndex, decryptPrivateData, encryptPrivateData } from '@/lib/privateData';

const CATEGORIES = ['farmer', 'fisherman', 'disaster_manager', 'citizen', 'other'];

function getMissingAuthVariables() {
  return ['MONGODB_URI', 'AUTH_SESSION_SECRET', 'AUTH_DATA_ENCRYPTION_KEY']
    .filter((name) => !process.env[name]);
}

function safeUser(user) {
  return {
    id: String(user._id),
    name: decryptPrivateData(user.nameEncrypted),
    phone: decryptPrivateData(user.phoneEncrypted),
    category: user.category,
    customCategory: user.customCategory,
    profileImage: user.profileImage || '',
  };
}

export async function POST(request) {
  try {
    const missingVariables = getMissingAuthVariables();
    if (missingVariables.length > 0) {
      return NextResponse.json(
        { message: `Authentication is not configured on this deployment. Add ${missingVariables.join(', ')} in Vercel Environment Variables, then redeploy.` },
        { status: 503 }
      );
    }

    const { name, phone, category, customCategory, profileImage } = await request.json();

    if (!name || !phone || !category) {
      return NextResponse.json(
        { message: 'Name, phone, and category are required.' },
        { status: 400 }
      );
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { message: 'Name must be at least 2 characters long.' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      return NextResponse.json({ message: 'Please provide a valid phone number.' }, { status: 400 });
    }

    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ message: 'Please choose a valid category.' }, { status: 400 });
    }

    if (category === 'other' && (typeof customCategory !== 'string' || customCategory.trim().length < 2)) {
      return NextResponse.json({ message: 'Please enter your category.' }, { status: 400 });
    }

    await connectDB();

    const phoneHash = blindIndex(normalizedPhone);
    const existingUser = await User.findOne({ phoneHash }).select('+phoneHash');

    if (existingUser) {
      return NextResponse.json(
        { message: 'A user with this phone number already exists.' },
        { status: 409 }
      );
    }

    const user = await User.create({
      nameEncrypted: encryptPrivateData(name.trim()),
      phoneEncrypted: encryptPrivateData(normalizedPhone),
      phoneHash,
      profileImage: typeof profileImage === 'string' ? profileImage.trim() : '',
      category,
      ...(category === 'other' ? { customCategory: customCategory.trim() } : {}),
    });

    const response = NextResponse.json({ success: true, message: 'Account created successfully.', user: safeUser(user) }, { status: 201 });
    setSessionCookie(response, user._id);
    return response;
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ message: 'An account with those details already exists.' }, { status: 409 });
    }

    if (error?.name === 'MongooseServerSelectionError' || error?.name === 'MongoServerSelectionError' || error?.message?.includes('querySrv')) {
      console.error('Registration database connection failed:', error.name);
      return NextResponse.json(
        { message: 'Unable to connect to the account database. Check MongoDB Atlas Network Access and the MONGODB_URI in Vercel, then redeploy.' },
        { status: 503 }
      );
    }

    if (error?.name === 'ValidationError') {
      return NextResponse.json(
        { message: 'Some account details are invalid. Please check the form and try again.' },
        { status: 400 }
      );
    }

    if (error?.message?.includes('is not configured') || error?.message?.includes('must be a 32-byte')) {
      return NextResponse.json(
        { message: 'Authentication is not configured correctly. Check MONGODB_URI, AUTH_SESSION_SECRET, and AUTH_DATA_ENCRYPTION_KEY in Vercel Environment Variables.' },
        { status: 503 }
      );
    }

    console.error('Registration failed:', error?.name || 'UnknownError');

    return NextResponse.json(
      { message: 'Unable to create the account. Check the Vercel function logs for the registration error.' },
      { status: 500 }
    );
  }
}
