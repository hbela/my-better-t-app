import { authClient } from "@/lib/auth-client";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import Loader from "./loader";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignUpForm({
  onSwitchToSignIn,
}: {
  onSwitchToSignIn: () => void;
}) {
  const navigate = useNavigate({
    from: "/",
  });
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
        },
        {
          onSuccess: async (context) => {
            toast.success("Sign up successful!");

            // Check if user signed up from external app with organization context
            const externalAppOrgId = sessionStorage.getItem("externalAppOrgId");

            if (externalAppOrgId) {
              console.log("🔗 Adding user to organization:", externalAppOrgId);
              try {
                // Add user as member of the organization
                const response = await fetch(
                  `${import.meta.env.VITE_SERVER_URL}/api/members/join`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                      organizationId: externalAppOrgId,
                    }),
                  }
                );

                console.log(
                  "🔗 Join organization response:",
                  response.status,
                  response.statusText
                );

                if (response.ok) {
                  const result = await response.json();
                  console.log("✅ Successfully joined organization:", result);
                  toast.success(
                    "Welcome! You've been added to the organization."
                  );
                } else {
                  const errorData = await response.json();
                  console.error(
                    "❌ Failed to add user to organization:",
                    errorData
                  );
                  toast.error(
                    "Failed to join organization. Please contact support."
                  );
                }
              } catch (error) {
                console.error("❌ Error adding user to organization:", error);
                toast.error(
                  "Failed to join organization. Please contact support."
                );
              }
            }

            // Get user role from the sign-up response context
            // @ts-ignore - role is UserRole enum
            const role = context.data?.user?.role;

            // Redirect based on role - each role has its own dashboard
            if (role === "ADMIN") {
              navigate({ to: "/admin/" });
            } else if (role === "OWNER") {
              navigate({ to: "/owner/" });
            } else if (role === "PROVIDER") {
              navigate({ to: "/provider/" });
            } else {
              // CLIENT or default
              navigate({ to: "/client/" });
            }
          },
          onError: (error) => {
            const errorMessage =
              (error as any)?.error?.message || "Sign up failed";
            toast.error(errorMessage);
            console.error("Signup error:", error);
          },
        }
      );
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="mx-auto w-full mt-10 max-w-md p-6">
      <h1 className="mb-6 text-center text-3xl font-bold">Create Account</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error, index) => (
                  <p key={index} className="text-red-500 text-sm">
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error, index) => (
                  <p key={index} className="text-red-500 text-sm">
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Password</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error, index) => (
                  <p key={index} className="text-red-500 text-sm">
                    {String(error)}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe>
          {(state) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting ? "Submitting..." : "Sign Up"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-4 text-center">
        <Button
          variant="link"
          onClick={onSwitchToSignIn}
          className="text-indigo-600 hover:text-indigo-800"
        >
          Already have an account? Sign In
        </Button>
      </div>
    </div>
  );
}
