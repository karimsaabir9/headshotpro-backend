export class AuthService {
  //register user

  async registerUser(
    input: any,
  ): Promise<{ success: boolean; message: string }> {
    //TODO: implement user registeration logic
    return {
      success: true,
      message: "User registered successfully",
    };
  }
}


export const authService = new AuthService();