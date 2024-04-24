export const groups = {
    cpu: [
        "cpu_aidle",
        "cpu_idle",
        "cpu_nice",
        "cpu_num",
        "cpu_speed",
        "cpu_system",
        "cpu_wio"
    ],
    network: [
        "bytes_in",
        "bytes_out"
    ],
    disk: [
        "disk_free",
        "disk_total",
        "part_max_used"
    ],
    memory: [
        "mem_buffers",
        "mem_cached",
        "mem_free",
        "mem_shared",
        "mem_total",
        "swap_total",
        "swap_free"
    ],
    process: [
        "proc_total",
        "proc_free"
    ],
    system: [
        "boottime"
    ],
    load: [
        "load_fifteen",
        "load_five",
        "load_one"
    ],
    retrans: [
        "RetransSegs_rate",
        "RetransSegs",
        "RPCRetrans_rate",
        "RPCRetrans",
        "TCPFastRetrans_rate",
        "TCPFastRetrans",
        "TCPForwardRetrans_rate",
        "TCPForwardRetrans",
        "TCPLostRetransmit_rate",
        "TCPLostRetransmit",
        "TCPSlowStartRetrans_rate",
        "TCPSlowStartRetrans",
        "TotalRetrans_rate",
        "TotalRetrans"
    ]
}