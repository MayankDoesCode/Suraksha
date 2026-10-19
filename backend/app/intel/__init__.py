"""
Passive domain intelligence for SURAKSHA.

Everything in this package observes public, third-party registry and DNS data about a domain name.
It never fetches or renders a candidate website, and every outbound connection is gated by
`netsafe`, which refuses private, loopback, link-local and other non-public addresses.
"""
