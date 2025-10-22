import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import type { View } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addHours,
  startOfHour,
} from "date-fns";
import { enUS } from "date-fns/locale";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Setup the localizer for BigCalendar
const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export const Route = createFileRoute("/provider/calendar")({
  component: ProviderCalendarComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        to: "/login",
      });
    }

    return { session };
  },
});

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  isBooked: boolean;
  booking?: any;
}

function ProviderCalendarComponent() {
  const { session } = Route.useRouteContext();
  const [provider, setProvider] = useState<any>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
  });

  // Load provider info
  useEffect(() => {
    const loadProvider = async () => {
      try {
        // Get user's provider info
        const response = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/api/providers?userId=${
            session.data?.user.id
          }`,
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          const providers = await response.json();
          if (providers.length > 0) {
            setProvider(providers[0]);
          } else {
            toast.error("You are not registered as a provider");
          }
        }
      } catch (err) {
        console.error("Error loading provider:", err);
        toast.error("Error loading provider information");
      } finally {
        setLoading(false);
      }
    };

    loadProvider();
  }, [session.data?.user.id]);

  // Load events
  useEffect(() => {
    if (provider) {
      loadEvents();
    }
  }, [provider]);

  const loadEvents = async () => {
    if (!provider) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/events?providerId=${
          provider.id
        }`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        const now = new Date();
        const formattedEvents = data
          .map((event: any) => ({
            id: event.id,
            title: event.isBooked
              ? `${event.title} - Booked by ${
                  event.booking?.member?.name || "Client"
                }`
              : event.title,
            description: event.description,
            start: new Date(event.start),
            end: new Date(event.end),
            isBooked: event.isBooked,
            booking: event.booking,
          }))
          .filter((event: CalendarEvent) => event.start > now); // Only show future events

        console.log(
          "📅 Loaded events for provider:",
          formattedEvents.length,
          "events"
        );
        console.log(
          "Booked events:",
          formattedEvents.filter((e: CalendarEvent) => e.isBooked).length
        );
        setEvents(formattedEvents);
      } else {
        toast.error("Failed to load events");
      }
    } catch (err) {
      console.error("Error loading events:", err);
      toast.error("Error loading events");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    // Check if the selected date is in the past
    const now = new Date();
    if (start < now) {
      toast.error("Cannot create availability in the past");
      return;
    }

    // Round to nearest 30-minute slot
    const minutes = start.getMinutes();
    const roundedStart = new Date(start);
    roundedStart.setMinutes(minutes < 30 ? 0 : 30, 0, 0);

    // Create 30-minute slot
    const roundedEnd = new Date(roundedStart);
    roundedEnd.setMinutes(roundedEnd.getMinutes() + 30);

    setSelectedSlot({ start: roundedStart, end: roundedEnd });
    setSelectedEvent(null);
    setEventForm({ title: "", description: "" });
    setShowModal(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedSlot(null); // Clear selected slot when editing an event
    setEventForm({
      title: event.title,
      description: event.description || "",
    });
    setShowModal(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !selectedSlot) return;

    if (!eventForm.title) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            providerId: provider.id,
            title: eventForm.title,
            description: eventForm.description,
            start: selectedSlot.start.toISOString(),
            end: selectedSlot.end.toISOString(),
          }),
        }
      );

      if (response.ok) {
        toast.success("Event created successfully");
        setShowModal(false);
        loadEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create event");
      }
    } catch (err) {
      toast.error("Error creating event");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/events/${selectedEvent.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            title: eventForm.title,
            description: eventForm.description,
          }),
        }
      );

      if (response.ok) {
        toast.success("Event updated successfully");
        setShowModal(false);
        loadEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update event");
      }
    } catch (err) {
      toast.error("Error updating event");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/events/${selectedEvent.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success("Event deleted successfully");
        setShowModal(false);
        loadEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete event");
      }
    } catch (err) {
      toast.error("Error deleting event");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Event styling based on booking status
  const eventStyleGetter = (event: CalendarEvent) => {
    const style = {
      backgroundColor: event.isBooked ? "#ef4444" : "#10b981",
      borderRadius: "5px",
      opacity: 0.8,
      color: "white",
      border: "0px",
      display: "block",
    };
    return { style };
  };

  if (loading && !provider) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You are not registered as a provider. Please contact your
              organization owner.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Calendar</h1>
        <p className="text-muted-foreground">
          Manage your availability - {provider.department?.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Availability Calendar</CardTitle>
          <CardDescription>
            Click on the calendar to create new availability slots (8 AM - 8 PM
            only). Green = Available, Red = Booked. Past dates are not
            selectable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: 600 }} className="calendar-container">
            <style>{`
              /* Base styles for time slots - ensure hour borders are visible */
              .rbc-time-view .rbc-time-gutter .rbc-time-slot,
              .rbc-time-view .rbc-day-slot .rbc-time-slot {
                border-top: 1px solid #e5e5e5;
              }
              
              /* Suppress half-hour dividers globally to match light mode */
              .rbc-timeslot-group .rbc-time-slot:nth-child(odd) {
                border-top: none !important;
              }
              
              /* Dark mode: Fix navigation buttons visibility */
              .dark .rbc-toolbar button {
                color: #ffffff !important;
                background-color: #374151 !important;
                border: 1px solid #6b7280 !important;
                padding: 8px 12px !important;
                margin: 0 2px !important;
                border-radius: 4px !important;
                font-weight: 500 !important;
              }
              
              .dark .rbc-toolbar button:hover {
                background-color: #4b5563 !important;
                color: #ffffff !important;
              }
              
              .dark .rbc-toolbar button.rbc-active {
                background-color: #3b82f6 !important;
                color: #ffffff !important;
              }
              
              /* Dark mode: Improve grid border visibility */
              .dark .rbc-time-view .rbc-time-slot {
                border-top: 1px solid #6b7280 !important;
              }
              
              .dark .rbc-time-view .rbc-day-bg {
                border-right: 1px solid #6b7280 !important;
              }
              
              .dark .rbc-time-header .rbc-time-header-content {
                border-bottom: 1px solid #6b7280 !important;
              }
              
              .dark .rbc-time-view {
                border: 1px solid #6b7280 !important;
              }
              
              .dark .rbc-time-content {
                border-top: 1px solid #6b7280 !important;
              }
              
              .dark .rbc-day-slot {
                border-right: 1px solid #6b7280 !important;
              }
              
              .dark .rbc-time-gutter {
                border-right: 1px solid #6b7280 !important;
              }
              
              /* Light mode: Ensure borders are visible */
              .rbc-time-view .rbc-time-slot {
                border-top: 1px solid #e5e5e5 !important;
              }
              
              .rbc-time-view .rbc-day-slot {
                border-right: 1px solid #e5e5e5;
              }
            `}</style>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              style={{ height: "100%" }}
              step={30}
              showMultiDayTimes
              defaultView="week"
              min={new Date(0, 0, 0, 8, 0, 0)}
              max={new Date(0, 0, 0, 20, 0, 0)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {selectedEvent
                  ? selectedEvent.isBooked
                    ? "View Booking"
                    : "Edit Event"
                  : "Create Availability"}
              </CardTitle>
              {selectedSlot && !selectedEvent && (
                <CardDescription>
                  {format(selectedSlot.start, "PPP p")} -{" "}
                  {format(selectedSlot.end, "p")}
                </CardDescription>
              )}
              {selectedEvent && (
                <CardDescription>
                  {format(selectedEvent.start, "PPP p")} -{" "}
                  {format(selectedEvent.end, "p")}
                  {selectedEvent.isBooked && (
                    <span className="block mt-1 text-red-600">
                      Booked by: {selectedEvent.booking?.member?.name}
                    </span>
                  )}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {selectedEvent?.isBooked ? (
                <div className="space-y-2">
                  <p>
                    <strong>Title:</strong> {selectedEvent.title}
                  </p>
                  <p>
                    <strong>Booked by:</strong>{" "}
                    {selectedEvent.booking?.member?.name}
                  </p>
                  <p>
                    <strong>Email:</strong>{" "}
                    {selectedEvent.booking?.member?.email}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowModal(false)}
                      className="flex-1"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={
                    selectedEvent ? handleUpdateEvent : handleCreateEvent
                  }
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Available for consultation"
                      value={eventForm.title}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, title: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                      id="description"
                      placeholder="Add notes..."
                      value={eventForm.description}
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    {selectedEvent && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDeleteEvent}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    )}
                    <Button type="submit" disabled={loading} className="flex-1">
                      {loading
                        ? "Saving..."
                        : selectedEvent
                        ? "Update"
                        : "Create"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
