import { Container, Divider, Typography } from '@mui/material';

export default function Page() {
    return (
        <Container sx={{ py: 5 }}>
            <Typography variant='h3'>Privacy Policy</Typography>
            <Typography my={3}>
                This Privacy Policy outlines how ChessDojo collects, uses, and protects your
                information. We know that in chess, information is power—but in privacy, less is
                usually more. We’ve kept this straightforward so you can get back to your tactics.
            </Typography>

            <Divider />

            <Typography variant='h4' mt={4} mb={3} fontWeight='bold'>
                1. Information We Collect
            </Typography>
            <Typography>
                To provide a smooth training experience, we collect the following:
            </Typography>
            <ul>
                <li>
                    <b>Account Credentials</b>: Email and password
                </li>
                <li>
                    <b>OAuth Data</b>: Profile info from third parties (e.g., Google, Discord) if
                    you use them to sign in
                </li>
                <li>
                    <b>Profile Identities</b>: Your name and your usernames on various platforms
                    such as Chess.com or Lichess, if you choose to link them to your ChessDojo
                    account
                </li>
                <li>
                    <b>Usage Data</b>: We automatically collect technical information, including
                    your IP address, browser type, page views, and request latency
                </li>
            </ul>

            <Typography variant='h4' mt={4} mb={3} fontWeight='bold'>
                2. How We Use Your Data
            </Typography>
            <Typography>We use your information to:</Typography>
            <ul>
                <li>Manage your account and sync your chess ratings.</li>
                <li>Facilitate community interactions.</li>
                <li>
                    Performance Tuning: We analyze usage data to find bottlenecks, fix slow-loading
                    pages, and improve the overall user experience.
                </li>
            </ul>

            <Typography variant='h4' mt={4} mb={3} fontWeight='bold'>
                3. Data Sharing & Third Parties
            </Typography>
            <Typography>
                We do not sell, rent, or share your personal data with third-party companies.
                However, we do work with a specific partner to keep the Dojo running fast:
            </Typography>
            <ul>
                <li>
                    Google Analytics: We share broad, de-identified usage data (like which pages are
                    popular and how long they take to load) with Google Analytics. This helps us
                    understand Dojo traffic patterns. This data does not include your email,
                    password, or other personal data.
                </li>
                <li>
                    No Other Third Parties: Outside of these performance tools, your data stays
                    within the Dojo.
                </li>
            </ul>

            <Typography variant='h4' mt={4} mb={3} fontWeight='bold'>
                4. Cookies & Tracking
            </Typography>
            <Typography>
                We use cookies to keep you logged in and to power the Google Analytics mentioned
                above.
            </Typography>

            <Typography variant='h4' mt={4} mb={3} fontWeight='bold'>
                5. Community Visibility
            </Typography>
            <Typography>You remain in control of your social presence:</Typography>
            <ul>
                <li>
                    User Profiles: You can choose to make your chess handles visible to other
                    registered Dojo members.
                </li>
                <li>
                    Privacy Controls: You can toggle these visibility settings in your account
                    settings at any time.
                </li>
            </ul>

            <Typography variant='h4' mt={4} mb={3} fontWeight='bold'>
                6. Your Rights & Security
            </Typography>
            <Typography>
                We protect your data with standard encryption, but we always recommend using a
                unique password. You have the right to update your info, export your data, or delete
                your account entirely at any time.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant='h6' fontWeight='bold' mb={1}>
                Contact Us
            </Typography>
            <Typography>Questions? Reach out to the Dojo team via our support email.</Typography>

            <Typography mt={2}>
                <b>Last Updated:</b> February 2026
            </Typography>
        </Container>
    );
}
